from dotenv import find_dotenv, load_dotenv


def load_env() -> None:
    load_dotenv()  # read .env file
    load_dotenv(find_dotenv(".env.services"))  # read .env.services file
