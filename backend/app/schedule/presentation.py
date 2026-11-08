"""Opt-in notes projection; legacy clients retain their strict response shape."""

from typing import cast


def notes_projection(result: dict[str, object], *, enabled: bool) -> dict[str, object]:
    if enabled:
        return result

    def legacy(row: dict[str, object]) -> dict[str, object]:
        output = {key: value for key, value in row.items() if key != "notes"}
        if isinstance(output.get("snapshot"), dict):
            output["snapshot"] = {
                key: value
                for key, value in cast(dict[str, object], output["snapshot"]).items()
                if key != "notes"
            }
        return output

    output = legacy(result)
    if "items" in output:
        output["items"] = [legacy(row) for row in cast(list[dict[str, object]], output["items"])]
    return output
