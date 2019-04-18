donations-visualiser
====================

Australian Political Donations Visualiser

Currently running at http://www.politicaldonations.info/


# want to duplicate what we're doing?

You can run the entire site with a simple HTTP server, like SimpleHTTPServer from python2, or http.server from python 3.  All examples from here on in will use python 2, since that's what the scripts in the repo are written in.

## Setup your environment

1. Get yourself a python 2 virtualenv.  Use whatever method you use for this.  Personally, I use pyenv to manage python versions, and pyenv-virtualenv to manage virtualenvs.
1. Activate your virtualenv
1. Install dependencies: `pip install -r python/requirements.txt`

## Retrieve the latest donations data from the AEC

1. Change to the python folder: `cd python`
1. Download the data: `./download_data.py`
1. Process the data: `./process_data.py`

## Update the data file used by the visualisation

1. Move the datafile to the right spot: `mv data/all_data1.json ../data/all_data.json`

## run the server

1. change back to the root: `cd ..`
1. run server `python -m SimpleHTTPServer`

## view in your browser

1. navigate to http://localhost:8000/

## Enjoy.

## if it goes wrong

It's possible that when you're downloading the data from the AEC, that you encounter a political party that we haven't seen before (or it could just be the submission being named something slightly different from what was submitted previously).

When we download the data from the AEC, due to inconsistencies in the reporting submitted by the political parties, it is necessary that we normalise the naming of the parties for display in the visualisation.  We do this by maintaining a mapping in `python/parties.txt`.  If the download fails due to a mapping missing from this file, it will need to be added to the file (the format is pipe separated values), and the download script re-run.  Unfortunately, the script is not particularly robust, and it currently redownloads the lot, but it will fail on the first missing party, when there could be many more.  Some more robustness wouldn't go astray here.



