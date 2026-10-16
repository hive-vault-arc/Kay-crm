# Python documentation for KEPVY for KAY

Status: offline upstream reference plus a proposed KAY code-quality guide; no backend has been implemented  
Date: 2026-10-14  
Confirmed observation: the `python` command runs CPython 3.14.3 from `C:\Python314\python.exe`. The `py` launcher also finds CPython 3.14.3 and CPython 3.12.0.  
Accepted local baseline: Python 3.14.3 in backend/.venv under the approved sprint plan; SP-02 verifies/locks dependencies. Future production support is a separate check.  
References: [Python 3.14.3 release](https://www.python.org/downloads/release/python-3143/), [official 3.14.3 documentation archive](https://www.python.org/ftp/python/doc/3.14.3/), [KAY architecture](../../04-design/architecture.md), and [KAY acceptance tests](../../05-quality/acceptance-tests.md).

## Complete version-matched language reference

The official `python-3.14.3-docs-html.zip` archive is preserved [here](3.14.3/python-3.14.3-docs-html.zip) and extracted [here](3.14.3/html/index.html) for offline browsing. The ZIP is 16,032,475 bytes; its downloaded SHA-256 is `AD0B302DE05FBBCD34303505D1EE27B3B94BE8D2B610D9FB4710D0B82D341FE1`. The extraction contains 1,132 files, including 560 HTML pages, local search assets, and the [license](3.14.3/html/license.html). The copied upstream files have not been edited.

Useful entry points: [tutorial](3.14.3/html/tutorial/index.html), [language reference](3.14.3/html/reference/index.html), [standard library](3.14.3/html/library/index.html), [setup and usage](3.14.3/html/using/index.html), and [what changed in 3.14](3.14.3/html/whatsnew/3.14.html).

## Style and quality references

The official PEP source snapshots [PEP 8](standards/PEP-0008.rst) and [PEP 257](standards/PEP-0257.rst) were collected on 2026-10-14. Their live versions are [PEP 8](https://peps.python.org/pep-0008/) and [PEP 257](https://peps.python.org/pep-0257/). The [KAY Python code-quality guide](code-quality-for-kay.md) turns relevant guidance into a proposed working standard; it does not claim that a formatter, linter, type checker, or test suite has been installed or run.

This snapshot does not update automatically. It documents the Python 3.14.3 installed as the default command on this laptop, not an approved production runtime. The separate 3.12.0 installation is recorded here but its full documentation was not duplicated.
