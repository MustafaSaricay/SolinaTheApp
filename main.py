"""Solina – Desktop Power Consumption Tracker

Entry point: launches the tkinter application.

Usage
-----
    python main.py
"""

import sys

from solina.app import SolinaApp


def main() -> None:
    app = SolinaApp()
    app.mainloop()


if __name__ == "__main__":
    main()
