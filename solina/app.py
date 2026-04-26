"""Solina Desktop Application – main tkinter window.

Layout overview
───────────────
┌──────────────────────────────────────────────────────────┐
│          HEADER  (title  +  live clock)                  │
├─────────────────┬──────────────────┬─────────────────────┤
│  Battery Status │  Today's Usage   │  CO₂ Equivalent     │
├─────────────────┴──────────────────┴─────────────────────┤
│                  Hourly Bar Chart                        │
├──────────────────────────────────────────────────────────┤
│                  Recent Readings (table)                 │
├──────────────────────────────────────────────────────────┤
│  ● status  |  next reading in Xs  |  [Pause] [⚙] [Now]  │
└──────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk
from datetime import datetime
from typing import Optional

from .battery import get_battery_info
from .calculator import calculate_energy_delta_wh, estimate_co2_grams
from .database import Database
from . import settings as cfg

# ── Color palette (forest-green tones) ────────────────────────────────────────
P: dict = {
    "bg":       "#1B4332",   # deep forest green – window background
    "card":     "#2D6A4F",   # medium green – card backgrounds
    "card_hi":  "#40916C",   # lighter green – card title bars / header
    "accent":   "#52B788",   # bright green – accents, progress fills
    "pale":     "#95D5B2",   # pale green – secondary info
    "lightest": "#D8F3DC",   # near-white green – primary text
    "text":     "#D8F3DC",   # primary text
    "text2":    "#95D5B2",   # secondary text
    "white":    "#FFFFFF",
    "warn":     "#F4A261",   # amber – charging indicator
    "danger":   "#E76F51",   # red-orange – low battery
    "chart":    "#52B788",   # bar chart fill
}

FONT = "Helvetica"


# ── Helper widget ──────────────────────────────────────────────────────────────

class _Card(tk.Frame):
    """Padded Frame that looks like a card on the green background."""

    def __init__(self, parent: tk.Widget, **kwargs: object) -> None:
        super().__init__(parent, bg=P["card"], **kwargs)


# ── Main application ───────────────────────────────────────────────────────────

class SolinaApp(tk.Tk):
    """Main application window for Solina Power Tracker."""

    def __init__(self) -> None:
        super().__init__()
        self._settings: dict = cfg.load()
        self._db: Database = Database()
        self._last_reading: Optional[dict] = None
        self._monitoring: bool = True
        self._countdown: int = 0
        self._after_id: Optional[str] = None

        self._setup_window()
        self._build_ui()
        self._start_monitoring()
        self._update_clock()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── Window ────────────────────────────────────────────────────────────────

    def _setup_window(self) -> None:
        self.title("🌱 Solina – Power Tracker")
        self.geometry("980x700")
        self.minsize(720, 560)
        self.configure(bg=P["bg"])
        self.resizable(True, True)

    # ── UI construction ───────────────────────────────────────────────────────

    def _build_ui(self) -> None:
        self._build_header()
        self._build_cards()
        self._build_chart()
        self._build_history()
        self._build_status_bar()

    # ── Header ────────────────────────────────────────────────────────────────

    def _build_header(self) -> None:
        hdr = tk.Frame(self, bg=P["card_hi"], height=64)
        hdr.pack(fill="x")
        hdr.pack_propagate(False)

        tk.Label(
            hdr,
            text="🌱  Solina Power Tracker",
            bg=P["card_hi"],
            fg=P["lightest"],
            font=(FONT, 18, "bold"),
            padx=16,
        ).pack(side="left", fill="y")

        right = tk.Frame(hdr, bg=P["card_hi"])
        right.pack(side="right", padx=16, fill="y")

        self._date_label = tk.Label(
            right, bg=P["card_hi"], fg=P["text2"], font=(FONT, 10), text=""
        )
        self._date_label.pack(anchor="e")

        self._clock_label = tk.Label(
            right, bg=P["card_hi"], fg=P["lightest"], font=(FONT, 14, "bold"), text=""
        )
        self._clock_label.pack(anchor="e")

    # ── Stat cards ────────────────────────────────────────────────────────────

    def _build_cards(self) -> None:
        outer = tk.Frame(self, bg=P["bg"])
        outer.pack(fill="x", padx=12, pady=10)
        outer.columnconfigure(0, weight=1)
        outer.columnconfigure(1, weight=1)
        outer.columnconfigure(2, weight=1)

        self._batt_card = self._make_battery_card(outer)
        self._kwh_card = self._make_kwh_card(outer)
        self._co2_card = self._make_co2_card(outer)

        self._batt_card.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        self._kwh_card.grid(row=0, column=1, sticky="nsew", padx=6)
        self._co2_card.grid(row=0, column=2, sticky="nsew", padx=(6, 0))

    @staticmethod
    def _card_title(parent: tk.Widget, text: str) -> tk.Label:
        lbl = tk.Label(
            parent,
            text=text,
            bg=P["card_hi"],
            fg=P["text2"],
            font=(FONT, 8, "bold"),
            padx=10,
            pady=5,
            anchor="w",
        )
        lbl.pack(fill="x")
        return lbl

    def _make_battery_card(self, parent: tk.Widget) -> _Card:
        card = _Card(parent)
        self._card_title(card, "  BATTERY STATUS")

        body = tk.Frame(card, bg=P["card"], pady=8)
        body.pack(fill="both", expand=True, padx=10)

        self._batt_canvas = tk.Canvas(
            body, height=56, bg=P["card"], highlightthickness=0
        )
        self._batt_canvas.pack(fill="x", pady=(0, 4))
        self._batt_canvas.bind(
            "<Configure>",
            lambda _e: self.after(50, self._redraw_battery_canvas),
        )

        self._batt_pct_lbl = tk.Label(
            body, text="–", bg=P["card"], fg=P["lightest"], font=(FONT, 26, "bold")
        )
        self._batt_pct_lbl.pack()

        self._batt_status_lbl = tk.Label(
            body, text="Checking…", bg=P["card"], fg=P["text2"], font=(FONT, 10)
        )
        self._batt_status_lbl.pack()

        self._batt_time_lbl = tk.Label(
            body, text="", bg=P["card"], fg=P["pale"], font=(FONT, 9)
        )
        self._batt_time_lbl.pack(pady=(2, 6))

        return card

    def _make_kwh_card(self, parent: tk.Widget) -> _Card:
        card = _Card(parent)
        self._card_title(card, "  TODAY'S USAGE")

        body = tk.Frame(card, bg=P["card"], pady=8)
        body.pack(fill="both", expand=True, padx=10)

        self._kwh_value_lbl = tk.Label(
            body, text="0.000", bg=P["card"], fg=P["accent"], font=(FONT, 36, "bold")
        )
        self._kwh_value_lbl.pack(pady=(8, 0))

        tk.Label(
            body, text="kWh consumed today", bg=P["card"], fg=P["text2"], font=(FONT, 10)
        ).pack()

        self._kwh_wh_lbl = tk.Label(
            body, text="0.00 Wh", bg=P["card"], fg=P["pale"], font=(FONT, 9)
        )
        self._kwh_wh_lbl.pack(pady=(4, 6))

        return card

    def _make_co2_card(self, parent: tk.Widget) -> _Card:
        card = _Card(parent)
        self._card_title(card, "  CO₂ EQUIVALENT")

        body = tk.Frame(card, bg=P["card"], pady=8)
        body.pack(fill="both", expand=True, padx=10)

        self._co2_value_lbl = tk.Label(
            body, text="0.0", bg=P["card"], fg=P["pale"], font=(FONT, 36, "bold")
        )
        self._co2_value_lbl.pack(pady=(8, 0))

        tk.Label(
            body, text="grams of CO₂", bg=P["card"], fg=P["text2"], font=(FONT, 10)
        ).pack()

        self._co2_intensity_lbl = tk.Label(
            body,
            text=f"@ {self._settings['co2_grams_per_kwh']:.0f} g/kWh grid intensity",
            bg=P["card"],
            fg=P["pale"],
            font=(FONT, 8),
        )
        self._co2_intensity_lbl.pack(pady=(4, 6))

        return card

    # ── Hourly chart ──────────────────────────────────────────────────────────

    def _build_chart(self) -> None:
        outer = tk.Frame(self, bg=P["bg"])
        outer.pack(fill="both", expand=True, padx=12, pady=(0, 6))

        frame = _Card(outer)
        frame.pack(fill="both", expand=True)
        self._card_title(frame, "  HOURLY BREAKDOWN")

        self._chart_canvas = tk.Canvas(
            frame, bg=P["card"], highlightthickness=0, height=130
        )
        self._chart_canvas.pack(fill="both", expand=True)
        self._chart_canvas.bind(
            "<Configure>",
            lambda _e: self.after(50, self._refresh_chart),
        )

    def _refresh_chart(self) -> None:
        data = self._db.get_hourly_breakdown()
        canvas = self._chart_canvas
        canvas.delete("all")

        cw = canvas.winfo_width()
        ch = canvas.winfo_height()
        if cw < 20 or ch < 20:
            return

        PAD_L, PAD_R, PAD_T, PAD_B = 52, 8, 10, 26
        plot_w = cw - PAD_L - PAD_R
        plot_h = ch - PAD_T - PAD_B

        # Horizontal grid lines (5 divisions)
        for i in range(5):
            gy = PAD_T + int(plot_h * i / 4)
            canvas.create_line(PAD_L, gy, cw - PAD_R, gy, fill=P["card_hi"], dash=(2, 4))

        if not data:
            canvas.create_text(
                cw // 2, ch // 2,
                text="No readings yet today",
                fill=P["text2"],
                font=(FONT, 10),
            )
            return

        max_kwh = max(d["kwh"] for d in data) or 0.001
        hour_map: dict = {d["hour"]: d["kwh"] for d in data}
        slot_w = max(1, plot_w // 24)
        bar_w = max(4, slot_w - 2)

        for hour in range(24):
            kwh = hour_map.get(hour, 0.0)
            if kwh <= 0:
                continue
            bx = PAD_L + hour * slot_w + (slot_w - bar_w) // 2
            bh = int(kwh / max_kwh * plot_h * 0.9)
            by0 = PAD_T + plot_h - bh
            by1 = PAD_T + plot_h
            canvas.create_rectangle(
                bx, by0, bx + bar_w, by1, fill=P["chart"], outline=P["accent"]
            )
            if bh > 14:
                canvas.create_text(
                    bx + bar_w // 2, by0 - 6,
                    text=f"{kwh:.3f}",
                    fill=P["text"],
                    font=(FONT, 6),
                )

        # X-axis hour labels (every 3 hours)
        for hour in range(0, 24, 3):
            lx = PAD_L + hour * slot_w + slot_w // 2
            canvas.create_text(
                lx, PAD_T + plot_h + 14,
                text=f"{hour:02d}h",
                fill=P["text2"],
                font=(FONT, 7),
            )

        # Y-axis labels
        canvas.create_text(
            PAD_L - 4, PAD_T,
            text=f"{max_kwh:.3f}",
            fill=P["text2"],
            font=(FONT, 6),
            anchor="e",
        )
        canvas.create_text(
            PAD_L - 4, PAD_T + plot_h,
            text="0.000",
            fill=P["text2"],
            font=(FONT, 6),
            anchor="e",
        )
        canvas.create_text(
            14, ch // 2,
            text="kWh",
            fill=P["text2"],
            font=(FONT, 7),
        )

    # ── Recent readings table ─────────────────────────────────────────────────

    def _build_history(self) -> None:
        outer = tk.Frame(self, bg=P["bg"])
        outer.pack(fill="x", padx=12, pady=(0, 6))

        frame = _Card(outer)
        frame.pack(fill="x")
        self._card_title(frame, "  RECENT READINGS")

        tv_frame = tk.Frame(frame, bg=P["card"])
        tv_frame.pack(fill="x", padx=2, pady=2)

        style = ttk.Style()
        style.theme_use("default")
        style.configure(
            "Solina.Treeview",
            background=P["card"],
            foreground=P["text"],
            fieldbackground=P["card"],
            rowheight=22,
            font=(FONT, 9),
        )
        style.configure(
            "Solina.Treeview.Heading",
            background=P["card_hi"],
            foreground=P["text2"],
            font=(FONT, 9, "bold"),
        )
        style.map("Solina.Treeview", background=[("selected", P["accent"])])

        cols = ("time", "percent", "status", "delta_wh")
        self._tree = ttk.Treeview(
            tv_frame, columns=cols, show="headings", height=5, style="Solina.Treeview"
        )
        for col, heading, width in (
            ("time",     "Timestamp",    170),
            ("percent",  "Battery %",     90),
            ("status",   "Status",        110),
            ("delta_wh", "Energy (Wh)",   110),
        ):
            self._tree.heading(col, text=heading)
            self._tree.column(col, width=width, anchor="center")

        vsb = ttk.Scrollbar(tv_frame, orient="vertical", command=self._tree.yview)
        self._tree.configure(yscrollcommand=vsb.set)
        self._tree.pack(side="left", fill="x", expand=True)
        vsb.pack(side="right", fill="y")

    # ── Status bar ────────────────────────────────────────────────────────────

    def _build_status_bar(self) -> None:
        bar = tk.Frame(self, bg=P["card_hi"], height=40)
        bar.pack(fill="x", side="bottom")
        bar.pack_propagate(False)

        self._status_dot = tk.Label(
            bar, text="●", bg=P["card_hi"], fg=P["accent"], font=(FONT, 14)
        )
        self._status_dot.pack(side="left", padx=(12, 4))

        self._status_lbl = tk.Label(
            bar, text="Monitoring active", bg=P["card_hi"], fg=P["text"], font=(FONT, 9)
        )
        self._status_lbl.pack(side="left")

        self._next_lbl = tk.Label(
            bar, text="", bg=P["card_hi"], fg=P["text2"], font=(FONT, 9)
        )
        self._next_lbl.pack(side="left", padx=16)

        btn_kw = dict(
            bg=P["accent"], fg=P["bg"],
            font=(FONT, 9, "bold"),
            relief="flat", padx=10, pady=4,
            cursor="hand2",
            activebackground=P["pale"],
            activeforeground=P["bg"],
        )

        tk.Button(
            bar, text="⚙ Settings", command=self._open_settings, **btn_kw
        ).pack(side="right", padx=(4, 12))

        tk.Button(
            bar, text="Read Now", command=self._take_reading, **btn_kw
        ).pack(side="right", padx=4)

        self._pause_btn = tk.Button(
            bar, text="⏸ Pause", command=self._toggle_monitoring, **btn_kw
        )
        self._pause_btn.pack(side="right", padx=4)

    # ── Live clock ────────────────────────────────────────────────────────────

    def _update_clock(self) -> None:
        now = datetime.now()
        self._clock_label.configure(text=now.strftime("%H:%M:%S"))
        self._date_label.configure(text=now.strftime("%A, %d %B %Y"))
        if self._monitoring and self._countdown > 0:
            self._countdown -= 1
            self._next_lbl.configure(text=f"Next reading in {self._countdown}s")
        self.after(1000, self._update_clock)

    # ── Monitoring ────────────────────────────────────────────────────────────

    def _start_monitoring(self) -> None:
        self._take_reading()
        self._schedule_next()

    def _schedule_next(self) -> None:
        if not self._monitoring:
            return
        interval = int(self._settings.get("poll_interval_seconds", 300))
        self._countdown = interval
        self._after_id = self.after(interval * 1000, self._periodic_read)

    def _periodic_read(self) -> None:
        self._take_reading()
        self._schedule_next()

    def _toggle_monitoring(self) -> None:
        self._monitoring = not self._monitoring
        if not self._monitoring:
            if self._after_id:
                self.after_cancel(self._after_id)
                self._after_id = None
            self._status_lbl.configure(text="Monitoring paused")
            self._status_dot.configure(fg=P["warn"])
            self._next_lbl.configure(text="")
            self._pause_btn.configure(text="▶ Resume")
        else:
            self._status_lbl.configure(text="Monitoring active")
            self._status_dot.configure(fg=P["accent"])
            self._pause_btn.configure(text="⏸ Pause")
            self._schedule_next()

    def _take_reading(self) -> None:
        info = get_battery_info()
        now = datetime.now()

        if info is None:
            self._update_battery_ui(None)
            return

        energy_delta_wh = 0.0
        if self._last_reading is not None:
            energy_delta_wh = calculate_energy_delta_wh(
                prev_percent=self._last_reading["battery_percent"],
                curr_percent=info["percent"],
                battery_capacity_wh=float(self._settings.get("battery_capacity_wh", 50.0)),
                was_plugged=bool(self._last_reading["is_plugged"]),
                is_plugged=info["is_plugged"],
            )

        self._db.insert_reading(now, info["percent"], info["is_plugged"], energy_delta_wh)
        self._last_reading = {
            "battery_percent": info["percent"],
            "is_plugged": info["is_plugged"],
        }
        self._refresh_all(info)

    def _refresh_all(self, info: Optional[dict]) -> None:
        self._update_battery_ui(info)
        self._update_kwh_ui()
        self._update_history_ui()
        self.after(200, self._refresh_chart)

    # ── Battery card helpers ──────────────────────────────────────────────────

    def _update_battery_ui(self, info: Optional[dict]) -> None:
        if info is None:
            self._batt_pct_lbl.configure(text="N/A", fg=P["text2"])
            self._batt_status_lbl.configure(text="No battery detected")
            self._batt_time_lbl.configure(text="Running on AC power or VM")
            self._batt_canvas.delete("all")
            w = self._batt_canvas.winfo_width() or 200
            h = self._batt_canvas.winfo_height() or 56
            self._batt_canvas.create_text(
                w // 2, h // 2, text="No battery", fill=P["text2"], font=(FONT, 10)
            )
            return

        pct = info["percent"]
        plugged = info["is_plugged"]

        color = P["accent"] if pct > 60 else (P["warn"] if pct > 20 else P["danger"])
        self._batt_pct_lbl.configure(text=f"{pct:.0f}%", fg=color)

        if plugged:
            self._batt_status_lbl.configure(text="⚡ Charging", fg=P["warn"])
        else:
            self._batt_status_lbl.configure(text="🔋 Discharging", fg=P["text2"])

        secs = info.get("seconds_left")
        if secs:
            mins = secs // 60
            hh, mm = divmod(mins, 60)
            self._batt_time_lbl.configure(
                text=f"{hh}h {mm:02d}m remaining", fg=P["pale"]
            )
        elif plugged:
            self._batt_time_lbl.configure(text="Plugged in", fg=P["pale"])
        else:
            self._batt_time_lbl.configure(text="", fg=P["pale"])

        self._current_batt_info = info  # remember for canvas redraws
        self._redraw_battery_canvas()

    def _redraw_battery_canvas(self) -> None:
        info = getattr(self, "_current_batt_info", None)
        pct = info["percent"] if info else 0.0
        plugged = info["is_plugged"] if info else False

        canvas = self._batt_canvas
        canvas.delete("all")
        cw = canvas.winfo_width() or 200
        ch = canvas.winfo_height() or 56

        margin = 8
        tip_w = 7
        tip_h = int(ch * 0.36)

        bx1, by1 = margin, margin // 2 + 2
        bx2, by2 = cw - margin - tip_w - 3, ch - margin // 2 - 2

        fill_color = (
            P["accent"] if pct > 60 else (P["warn"] if pct > 20 else P["danger"])
        )

        # Fill bar
        body_inner_w = bx2 - bx1 - 4
        fill_w = max(0.0, body_inner_w * pct / 100.0)
        canvas.create_rectangle(
            bx1 + 2, by1 + 2, bx1 + 2 + fill_w, by2 - 2,
            fill=fill_color, outline="",
        )

        # Battery body outline
        canvas.create_rectangle(bx1, by1, bx2, by2, outline=P["pale"], width=2)

        # Terminal tip
        tip_top = ch // 2 - tip_h // 2
        tip_bot = ch // 2 + tip_h // 2
        canvas.create_rectangle(
            bx2 + 2, tip_top, bx2 + 2 + tip_w, tip_bot,
            fill=P["pale"], outline="",
        )

        # Bolt overlay when charging
        if plugged:
            canvas.create_text(
                (bx1 + bx2) // 2, (by1 + by2) // 2,
                text="⚡", font=(FONT, 16), fill=P["warn"],
            )

    # ── kWh / CO₂ updates ────────────────────────────────────────────────────

    def _update_kwh_ui(self) -> None:
        kwh = self._db.get_daily_kwh()
        wh = kwh * 1000.0
        co2 = estimate_co2_grams(kwh, float(self._settings.get("co2_grams_per_kwh", 233.0)))

        self._kwh_value_lbl.configure(text=f"{kwh:.3f}")
        self._kwh_wh_lbl.configure(text=f"{wh:.2f} Wh")
        self._co2_value_lbl.configure(text=f"{co2:.1f}")

    # ── History table ─────────────────────────────────────────────────────────

    def _update_history_ui(self) -> None:
        for row in self._tree.get_children():
            self._tree.delete(row)
        for r in self._db.get_recent_readings(limit=20):
            ts = r["timestamp"][:19].replace("T", " ")
            pct = f"{r['battery_percent']:.1f}%"
            status = "⚡ Charging" if r["is_plugged"] else "🔋 Discharging"
            wh = f"{r['energy_delta_wh']:.3f}"
            self._tree.insert("", "end", values=(ts, pct, status, wh))

    # ── Settings dialog ───────────────────────────────────────────────────────

    def _open_settings(self) -> None:
        dialog = tk.Toplevel(self)
        dialog.title("Solina – Settings")
        dialog.configure(bg=P["card"])
        dialog.geometry("440x340")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()

        tk.Label(
            dialog,
            text="Settings",
            bg=P["card_hi"],
            fg=P["lightest"],
            font=(FONT, 14, "bold"),
            padx=12,
            pady=8,
            anchor="w",
        ).pack(fill="x")

        form = tk.Frame(dialog, bg=P["card"], padx=20, pady=16)
        form.pack(fill="both", expand=True)
        form.columnconfigure(1, weight=1)

        label_kw = dict(bg=P["card"], fg=P["text"], font=(FONT, 10), anchor="w")
        entry_kw = dict(
            bg=P["bg"],
            fg=P["text"],
            insertbackground=P["text"],
            font=(FONT, 10),
            relief="flat",
            highlightbackground=P["accent"],
            highlightthickness=1,
        )

        field_defs = [
            ("Device name",              "device_name",          str),
            ("Battery capacity (Wh)",    "battery_capacity_wh",  float),
            ("Poll interval (seconds)",  "poll_interval_seconds", int),
            ("CO₂ intensity (g/kWh)",    "co2_grams_per_kwh",    float),
        ]

        vars_: list = []
        for idx, (label, key, typ) in enumerate(field_defs):
            tk.Label(form, text=label + ":", **label_kw).grid(
                row=idx, column=0, sticky="w", pady=8, padx=(0, 14)
            )
            var = tk.StringVar(value=str(self._settings.get(key, "")))
            tk.Entry(form, textvariable=var, width=26, **entry_kw).grid(
                row=idx, column=1, sticky="ew", pady=8
            )
            vars_.append((label, key, typ, var))

        btn_frame = tk.Frame(dialog, bg=P["card"], padx=20, pady=10)
        btn_frame.pack(fill="x")

        def _save() -> None:
            new_settings = dict(self._settings)
            for label, key, typ, var in vars_:
                raw = var.get().strip()
                try:
                    new_settings[key] = typ(raw)
                except (ValueError, TypeError):
                    messagebox.showerror(
                        "Invalid value",
                        f"'{raw}' is not a valid value for '{label}'.",
                        parent=dialog,
                    )
                    return
            self._settings = new_settings
            cfg.save(new_settings)
            # Update CO₂ intensity label
            self._co2_intensity_lbl.configure(
                text=f"@ {new_settings['co2_grams_per_kwh']:.0f} g/kWh grid intensity"
            )
            # Restart scheduling with possibly new interval
            if self._monitoring and self._after_id:
                self.after_cancel(self._after_id)
                self._after_id = None
            if self._monitoring:
                self._schedule_next()
            dialog.destroy()

        tk.Button(
            btn_frame,
            text="Save",
            command=_save,
            bg=P["accent"],
            fg=P["bg"],
            font=(FONT, 10, "bold"),
            relief="flat",
            padx=16,
            pady=6,
            cursor="hand2",
        ).pack(side="right")

        tk.Button(
            btn_frame,
            text="Cancel",
            command=dialog.destroy,
            bg=P["card_hi"],
            fg=P["text"],
            font=(FONT, 10),
            relief="flat",
            padx=16,
            pady=6,
            cursor="hand2",
        ).pack(side="right", padx=8)

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def _on_close(self) -> None:
        if self._after_id:
            self.after_cancel(self._after_id)
        self._db.close()
        self.destroy()
