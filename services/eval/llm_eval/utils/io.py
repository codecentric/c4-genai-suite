class Echo:
    """An object that implements just the write method of the file-like
    interface.
    """

    # noinspection PyMethodMayBeStatic
    def write(self, value: any) -> any:
        """Write the value by returning it, instead of storing in a buffer."""
        return value
