type JSONVal = None | bool | str | float | int | JSONArray | JSONObject
type JSONArray = list[JSONVal]
type JSONObject = dict[str, JSONVal]
