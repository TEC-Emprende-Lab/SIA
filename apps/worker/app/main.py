import logging
import time

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def run() -> None:
    """Keep the Phase 0 worker alive until persistent jobs are introduced."""
    logger.info('{"event":"worker.started","service":"worker"}')
    while True:
        time.sleep(60)


if __name__ == "__main__":
    run()
