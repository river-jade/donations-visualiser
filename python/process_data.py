#!/usr/bin/env python
import os, fnmatch, json, csv 

FILE_PATTERN = '*.json'
DATA_DIR = 'data/'

def load_party_info():
    i = 0
    j = 0

    parties = []

    party_file = open("parties.txt", "r")

    csv_parties = csv.DictReader(party_file, delimiter='|')

    for label in csv_parties:
        if label['Party'] not in parties:
            parties.append(label['Party'])

    return parties

def process_files(filenames, parties):
    data = []

    for filename in filenames:
        #print "Processing %s" % (filename)
        file_data = process_file(filename, parties)

        data.extend(file_data)

    return data

def process_file(filename, parties):
    out_data = []
    with open(filename, 'r') as f:
        data = json.load(f)

        if 'PaymentsReceived' not in data:
            return []

        if type(data['PaymentsReceived']) is dict:
            data['PaymentsReceived'] = [data['PaymentsReceived'], ]
        
        for d in data['PaymentsReceived']:
            temp = d
            temp['Year'] = data['Year'].split("-")[0]
            temp['Party'] = parties.index(data['Party']['Name'])
            out_data.append(temp) 

    return out_data

def process_entities(data):
    seenEntities = [] 
    entities = []

    for d in data:
        if d['PayerClientNm'] not in seenEntities:
            seenEntities.append(d['PayerClientNm'])
            entity = {
                        'Name': d['PayerClientNm'],
                        'Suburb': d['PayerSuburb'],
                        'Postcode': d['PayerPostcode'],
                        'Address': d['PayerAddressLine1'],
                        'State': d['PayerStateAb'],
                    }
            entities.append(entity)

    return entities

def process_receipt_types(data):
    receipt_types = {'Public Funding': 0}

    i = 1
    for d in data:
        if 'ReceiptTyDs' in d and d['ReceiptTyDs'] not in receipt_types:
            receipt_types[d['ReceiptTyDs']] = i
            i = i + 1

    return receipt_types

def munge_receipt_type(given_receipt_type, client_name):
    client = client_name.lower()
    if client in (
        'australian taxation office',
        'aec',
        'australian tax office',
        'department of finance',
    ) or 'electoral commission' in client:
        return 'Public Funding'    
    else:
        return given_receipt_type

def process_receipts(data, parties, entities, receipt_types):
    receipts = []

    entities_dict = dict((d["Name"], dict(d, id=i)) for (i, d) in enumerate(entities))
    parties_dict = dict((party, i) for (i, party) in enumerate(parties))

    for d in data:
        payer_name = d['PayerClientNm']
        receipt_type = munge_receipt_type(d['ReceiptTyDs'], payer_name)

        receipt = {
                     'Amount': d['AmountReceived'],
                     'Type': receipt_types[receipt_type],
                     'Party': d['Party'],
                     'Year': d['Year'],
                     'Entity': entities_dict[payer_name]['id'],
                   }

        receipts.append(receipt)

    return receipts


if __name__ == "__main__":
    filelist = []
    for root, dirs, filenames in os.walk(DATA_DIR):
        for filename in fnmatch.filter(filenames, FILE_PATTERN):
            filelist.append(os.path.join(root, filename))

    parties = load_party_info()
    data = process_files(filelist, parties)
    entities = process_entities(data)
    receipt_types = process_receipt_types(data)
    receipts = process_receipts(data, parties, entities, receipt_types)

    out_data = {
        'parties': parties,
        'entities': entities,
        'receipt_types': receipt_types,
        'receipts': receipts,
    }

    with open("all_data1.json", "w") as f:
        f.write(json.dumps(out_data))

