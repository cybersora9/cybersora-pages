"""Dane do trzech animowanych scen Pycodemath. Każda liczba pochodzi z wywołania silnika.

Uruchom z katalogu Pycodemath:  PYTHONPATH=. python ../cybersora-pages/pycodemath-sceny/dane_sceny.py
(check_code uruchamia funkcję w osobnym procesie, więc cały skrypt musi siedzieć pod __main__.)
"""
import json
import pathlib
import sys
from decimal import Decimal

from pycodemath import (E, check_code, emit_test, float_money_hazard,
                        minimize, round_money)

OUT = pathlib.Path(__file__).with_name("dane.json")


def scena_cena() -> dict:
    """Zysk = (cena - koszt) * popyt; popyt = 200 - 8*cena, koszt 5 zł. Silnik szuka minimum -zysku."""
    strata = "-(p-5)*(200-8*p)"
    e = E(strata)
    de = e.diff("p")
    f = lambda p: float(e.subs({"p": p}).evalf())
    d = lambda p: float(de.subs({"p": p}).evalf())
    przebiegi = []
    for start in (8.0, 22.0, 12.0):
        kroki = [{"k": 0, "cena": start, "zysk": -f(start), "nachylenie": -d(start)}]
        k = 0
        while True:
            k += 1
            r = minimize(E(strata), "p", start, max_iter=k, full_result=True)
            kroki.append({"k": k, "cena": r.value, "zysk": -f(r.value),
                          "nachylenie": -d(r.value), "status": r.status})
            if r.status == "converged" or k >= 80:
                break
        pelny = minimize(E(strata), "p", start, full_result=True)
        przebiegi.append({"start": start, "kroki": kroki,
                          "wynik": {"cena": pelny.value, "iteracje": pelny.iterations,
                                    "status": pelny.status, "zbiezny": pelny.converged,
                                    "zysk": -f(pelny.value)}})
    krzywa = [{"cena": c / 2, "zysk": -f(c / 2)} for c in range(10, 51)]  # 5,00 .. 25,00 zł
    return {"wzor_zysku": "(p-5)*(200-8*p)", "wywolanie": "minimize(-(p-5)*(200-8*p), p, start, max_iter=k)",
            "krzywa": krzywa, "przebiegi": przebiegi}


def scena_faktura() -> dict:
    """Pozycje faktury netto, VAT 23%. Zwykły komputer: float round(x*1.23, 2). Silnik: dokładnie."""
    netto = ["0.50", "12.40", "8.50", "19.90", "2.50", "33.50", "4.50", "15.00", "24.50", "7.90", "1.15", "49.90"]
    wiersze, suma_f, suma_d = [], Decimal("0"), Decimal("0")
    for n in netto:
        rap = float_money_hazard("round(x*1.23, 2)", variables={"x": [n]}, currency="PLN")
        fl = Decimal(str(round(float(n) * 1.23, 2)))
        dok = round_money(Decimal(n) * Decimal("1.23"), "PLN", "HALF_UP").rounded
        suma_f += fl
        suma_d += dok
        wiersze.append({"netto": n, "float": str(fl), "dokladnie": str(dok),
                        "rozjazd_gr": int((dok - fl) * 100), "hazard": rap.hazard,
                        "suma_float": str(suma_f), "suma_dokladnie": str(suma_d),
                        "brakuje_gr": int((suma_d - suma_f) * 100)})
    rap = float_money_hazard("round(x*1.23, 2)", variables={"x": ["0.50"]}, currency="PLN")
    return {"wywolanie": "float_money_hazard(\"round(x*1.23, 2)\") + round_money(..., \"PLN\", \"HALF_UP\")",
            "wiersze": wiersze,
            "przyczyna": {"literal": "1.23", "zapisane_jako": rap.literal_errors[0][1],
                          "wyjasnienie": rap.explanation, "swiadek": rap.witness,
                          "float": rap.float_value, "dokladnie": rap.exact_value},
            "wynik": {"suma_float": str(suma_f), "suma_dokladnie": str(suma_d),
                      "brakuje_gr": int((suma_d - suma_f) * 100)}}


KOD_BLEDNY = ("def rabat(n: int) -> int:\n"
              "    if n > 5:\n"
              "        return (n // 5) * 10\n"
              "    return 0\n")
KOD_POPRAWNY = ("def rabat(n: int) -> int:\n"
                "    if n >= 5:\n"
                "        return (n // 5) * 10\n"
                "    return 0\n")


def scena_regulamin() -> dict:
    """Regulamin: 10 zł rabatu za każde pełne 5 sztuk, czyli (n//5)*10."""
    wzor = "(n//5)*10"
    def rabat_b(n): return (n // 5) * 10 if n > 5 else 0
    def rabat_p(n): return (n // 5) * 10 if n >= 5 else 0
    zle = check_code(KOD_BLEDNY, wzor, domain={"n": "integer, n>=0"})
    dobrze = check_code(KOD_POPRAWNY, wzor, domain={"n": "integer, n>=0"})
    test = emit_test(zle, module="rabat")
    wiersze = [{"n": n, "regulamin": (n // 5) * 10, "kod": rabat_b(n), "po_poprawce": rabat_p(n)}
               for n in range(0, 11)]
    return {"wzor": wzor, "kod_bledny": KOD_BLEDNY, "kod_poprawny": KOD_POPRAWNY,
            "werdykt_bledny": {"verdict": str(zle.verdict), "powod": zle.reason,
                               "kontrprzyklad": zle.counterexample.call if zle.counterexample else None},
            "werdykt_poprawny": {"verdict": str(dobrze.verdict), "powod": dobrze.reason},
            "wiersze": wiersze, "wygenerowany_test": test}


if __name__ == "__main__":
    dane = {"cena": scena_cena(), "faktura": scena_faktura(), "regulamin": scena_regulamin()}
    OUT.write_text(json.dumps(dane, ensure_ascii=False, indent=1), encoding="utf-8")
    print("zapisano", OUT, OUT.stat().st_size, "B")
    for p in dane["cena"]["przebiegi"]:
        print("start", p["start"], "->", p["wynik"], "kroków:", len(p["kroki"]) - 1)
    print("faktura:", dane["faktura"]["wynik"])
    print("regulamin:", dane["regulamin"]["werdykt_bledny"], dane["regulamin"]["werdykt_poprawny"]["verdict"])
