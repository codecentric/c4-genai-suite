def download() -> None:
    from unstructured.nlp.tokenize import download_nltk_packages

    download_nltk_packages()  # type: ignore[no-untyped-call]

    import tiktoken

    tiktoken.get_encoding("cl100k_base")


if __name__ == "__main__":
    download()
