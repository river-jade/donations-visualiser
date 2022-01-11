#!/usr/bin/env python
import requests, zipfile, io

DATA_DIR = 'DATA/'

DATA_SOURCES = {
  "ELECTIONS_DATA": 'https://transparency.aec.gov.au/Download/AllElectionsData',
  "ANNUAL_DATA": 'https://transparency.aec.gov.au/Download/AllAnnualData'
}

#Check if the url is a downloadable file
def is_downloadable(url):
    h = requests.head(url, allow_redirects=True)
    header = h.headers
    content_type = header.get('content-type')

    print("Request Content Type:" + content_type)

    if 'text' in content_type.lower():
        print("Sigh...")
        return False
    if 'html' in content_type.lower():
        print("Sigh x2...")
        return False
    return True

def download_zip(zip_file_url, dest_folder):
    request = requests.get(zip_file_url)
    if request.ok:
        zip = zipfile.ZipFile(io.BytesIO(request.content))
        
        try:
            zip.testzip()
        except zipfile.BadZipFile:
            raise Exception(f"Zip file ({zip.filename}) is invalid or corrupt.")

        zip.extractall(f"{DATA_DIR}{dest_folder}")
    else:
        raise Exception(f"File download request ({zip_file_url}) failed")

def get_data_aec():
    # AEC managed to host their zip files without extensions or correct content type headers... 
    # TODO: Remove this when aec fixed their s#!+
    print("AEC loves to do things properly. Like uploading files without file extensions...")
    print("We will probably have to assume it's a zip")

    for name in DATA_SOURCES:
        print(f"Getting {name}")
        if is_downloadable(DATA_SOURCES[name]):
            print("Wow it's actually a proper file!.. *pats AEC on the head*")
            download_zip(DATA_SOURCES[name],name)
        else:
            download_zip(DATA_SOURCES[name],name)
    return True
  
if __name__ == "__main__":
    get_data_aec()
