from llm_eval.config.paths import DATA_DIR


def setup_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
