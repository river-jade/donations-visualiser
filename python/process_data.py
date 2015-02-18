#!/usr/bin/env python
import os, fnmatch, json

FILE_PATTERN = '*.json'
DATA_DIR = 'data/'

def process_files(filenames):
    data = {} 

    for filename in filenames:
        print "Processing %s" % (filename)
        file_data = process_file(filename)

        if 'PaymentsReceived' in file_data:
            if file_data['Year'] not in data:
                data[file_data['Year']] = {}
    
            if file_data['Party'] not in data[file_data['Year']]:
                data[file_data['Year']][file_data['Party']] = []
    
            data[file_data['Year']][file_data['Party']].extend(file_data['PaymentsReceived'])
    
    return data

def process_file(filename):
    with open(filename, 'r') as f:
        data = json.load(f)

    return data



if __name__ == "__main__":
    filelist = []
    for root, dirs, filenames in os.walk(DATA_DIR):
        for filename in fnmatch.filter(filenames, FILE_PATTERN):
            filelist.append(os.path.join(root, filename))

    data = process_files(filelist)

    combined_file = "all_data.json"

    with open(combined_file, "w") as f:
        f.write(json.dumps(data))

