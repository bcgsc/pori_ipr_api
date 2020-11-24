# Using the IPR API via Python

If you would like to use the IPR API programmatically, python is a good place to start. Below
we will cover the basics of connecting to the API and retrieving some data.

## Getting Started

If you are new to python it is a good idea to make a new directory and set up a virtual
environment for each separate project. The commands below will assume you are using python 3.6
or higher

```bash
mkdir ipr_tutorial
cd ipr_tutorial
python3 -m venv venv
source venv/bin/activate
pip install -U setuptools pip
```

Now that you have the environment set up we are going to install dependencies. Likely the only
one you will need here is the [requests library](https://requests.readthedocs.io/en/master/).

```bash
pip install requests
```

Now you are ready to start scripting. Create the file first

```bash
touch my_ipr_script.py
```

Now within this file we will need to first login to the API. The IPR API allows basic auth which is
what we will be using below. Since it is best not to hard-code password data, the example below
fetches the password from an environment variable called `PASS`. Note that on windows you
may also need to export the `USER` environment variable.

```python
import requests
import os

HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Encoding': 'deflate',
}

URL = 'https://ipr-api.bcgsc.ca/api'

# Get all Reports
response = requests.request(
    'GET', f'{URL}/reports', headers=HEADERS, auth=(os.environ['USER'], os.environ['PASS'])
)
content = response.json()

for report in content['reports']:
    print(report['patientId'], report['ident'])

```

This will print a list of reports with their patient Ids. The ident attribute is used in other
requests to fetch report-specific data. For example, to fetch the user signatures associated with
these reports

```python
for report in content['reports']:
    report_id = report['ident']
    sig_resp = requests.request(
        'GET', f'{URL}/reports/{report_id}/signatures', headers=HEADERS, auth=(os.environ['USER'], os.environ['PASS'])
    )
    sig_resp.raise_for_status()
    sigs = sig_resp.json()
    if sigs:
        print(f'report {report_id} signed at {sigs["authorSignedAt"]} and reviewed at {sigs["reviewerSignedAt"]})')

```

Then the script can be run as follows. First export your password as an environment variable

```bash
export PASS='<MY PASSWORD>'
```

Then run the script

```bash
python my_ipr_script.py
```

The parameters and route names for other requests you may wish to try can be found from the
[swagger specification](https://ipr-api.bcgsc.ca/api/spec). Simply sub in these values using the
same technique as above.
