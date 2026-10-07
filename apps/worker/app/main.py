"""La imagen del worker no usa este módulo.

El proceso que consume la cola es ``python -m app.worker`` del paquete de la API,
que es lo que copia ``apps/worker/Dockerfile``.
"""


def main() -> None:
    raise SystemExit(
        "El consumidor de la cola es python -m app.worker, dentro de la imagen de la API."
    )


if __name__ == "__main__":
    main()
