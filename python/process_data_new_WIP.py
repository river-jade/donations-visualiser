#!/usr/bin/env python
import os, fnmatch, json, csv 
from re import match, findall, sub

print("Starting process_data job on PID:", os.getpid())
# To run: pipenv run py $(pwd)/python/process_data.py
# or: pipenv shell & py ./python/process_data.py

#Outputs:
FILE_TEMP_DATA = "OUTPUT/MORE/temp_data.json"
FILE_ALL_DATA = "OUTPUT/MORE/all_data.json"

#Inputs:
FILE_PATTERN = '*.json'
DATA_DIR = 'DATA/'

ABR_PATTERN = '(?:(?<=\.|\s)[A-Z]\.)'
TRIM_PATTERN = r"^\s+|\s+$"

DEBUG = False

USEFUL_DATA = {
  "PARTY_RETURNS": 'ANNUAL_DATA/Party Returns.csv',
  "THIRD_PARTY_RETURNS": 'ANNUAL_DATA/Third Party Returns.csv',
  "DONOR_RETURNS": 'ANNUAL_DATA/Donor Returns.csv',
  "CAMPAIGNER_RETURNS": 'ANNUAL_DATA/Political Campaigner Returns.csv',
  "ASSOCIATED_RETURNS": 'ANNUAL_DATA/Associated Entity Returns.csv',
  "DETAILED_RECEIPTS": 'ANNUAL_DATA/Detailed Receipts.csv',
  "PUBLIC_ENTITIES": 'LOCAL_DATA/Public Entities.csv'
}

unknown_receipt_recipients = []

def open_file(file_path):
    if os.path.isfile(file_path):
        file = open(file_path, "r")
        return file
    else:
        raise Exception(f"Local file ({file_path}) does not exist... it should.")

def discover_unique_items_from_csv(item_description, csv_data_file, duplicate_comparator, fields_to_concatenate, parent_identifier_label):
    print(f"Discovering (parsing) {item_description} from {csv_data_file}.")
    all_items = []

    csv_file = open_file(f"{csv_data_file}")
    data_dict = csv.DictReader(csv_file, delimiter=',')

    duplicates_count = 0

    # Get all rows and generate long, bad entity list
    for row in data_dict:
        #add type switch
        if (item_description == 'third parties'):
            all_items.append(get_party_from_row(row))
        elif (item_description == 'donors'):
            all_items.append(get_party_from_row(row))
        elif (item_description == 'political campaigners'):
            all_items.append(get_entity_from_row(row))
        elif (item_description == 'associated entities'):
            all_items.append(get_assoc_entity_from_row(row))
        elif (item_description == 'receipt entities'):
            all_items.append(get_receipt_entity_from_row(row))
        else:
            raise Exception(f"Unknown item type ({item_description}) to extract csv items for.")
    
    shortlist_items = []
    
    # Go through the rows, remove duplicates and apply shorter/known parent party labels
    for index, item in enumerate(all_items):
        duplicate = False

        # If parent identifier column exists, compare all rows in search of the shortest identifying party name
        if (parent_identifier_label != ''):
            for compare_index, compare_item in enumerate(all_items):
                if (index != compare_index): # Dont compare to self
                    if (item[duplicate_comparator] != compare_item[duplicate_comparator]):
                        if (match(f"{compare_item[duplicate_comparator]}", f"{item[duplicate_comparator]}")):
                            item[parent_identifier_label] = compare_item[parent_identifier_label] # Party exists with parent
                            if DEBUG: print(f"Item {item[duplicate_comparator]} parent name changed to {compare_item[duplicate_comparator]}")
                            break

        # Discount already shortlisted parties (prevent duplicates)
        for shortlisted_item in shortlist_items:
            if item[duplicate_comparator] == shortlisted_item[duplicate_comparator]:
                duplicate = True
                duplicates_count +=1

        if (duplicate == False):
            shortlist_items.append(item)   
    
    print(f"{len(shortlist_items)} {item_description} shortlisted. {duplicates_count} duplicate items discounted.")

    return shortlist_items

def get_party_from_row(row):
    address = ''
    if (row['Address Line 2'] != ''):
        address = f"{row['Address Line 1']}, {row['Address Line 2']}"
    else:
        address = f"{row['Address Line 1']}"

    party = {
        'Name': sub(r"^\s+|\s+$", "", row['Name']),
        'State': row['State'],
        'Address': address,
        'Suburb':  row['Suburb'],
        'Postcode': row['Postcode']
    }
    return party

def get_entity_from_row(row):
    address = ''
    if (row['Address Line 2'] != ''):
        address = f"{row['Address Line 1']}, {row['Address Line 2']}"
    else:
        address = f"{row['Address Line 1']}"

    entity = {
        'Name': sub(r"^\s+|\s+$", "", row['Name']),
        'ABN': row['ABN'],
        'ACN': row['ACN'],
        'State': row['State'],
        'Address': address,
        'Suburb':  row['Suburb'],
        'Postcode': row['Postcode']
    }
    return entity

def get_receipt_entity_from_row(row):
    address = ''
    if (row['Address Line 2'] != ''):
        address = f"{row['Address Line 1']}, {row['Address Line 2']}"
    else:
        address = f"{row['Address Line 1']}"

    entity = {
        'Name': sub(TRIM_PATTERN, "", row['Received From']),
        'State': row['State'],
        'Address': address,
        'Suburb':  row['Suburb'],
        'Postcode': row['Postcode']
    }
    return entity

def get_assoc_entity_from_row(row):
    address = ''
    if (row['Address Line 2'] != ''):
        address = f"{row['Address Line 1']}, {row['Address Line 2']}"
    else:
        address = f"{row['Address Line 1']}"

    entity = {
        'Name': sub(r"^\s+|\s+$", "", row['Name']),
        'State': row['State'],
        'Address': address,
        'Suburb':  row['Suburb'],
        'Postcode': row['Postcode'],
        'Lodged on behalf of': sub(r"^\s+|\s+$", "", row['Lodged on behalf of']),
        'Associated Party': sub(r"^\s+|\s+$", "", row['Associated Party'])
    }
    return entity

def discover_parties():
    # We should be storing alias'
    print(f"Discovering (parsing) parties from party returns data.")
    all_listed_parties = []

    party_returns_file = open_file(f"{DATA_DIR}{USEFUL_DATA['PARTY_RETURNS']}")
    csv_party_returns = csv.DictReader(party_returns_file, delimiter=',')

    # Get all rows and generate long, bad entity list
    for row in csv_party_returns:
        party_group = row['Party Group']

        # If no party group is listed - use the label (for now)
        if (row['Party Group'] == ''):
            party_group = row['Name']

        party = {
                    'Label': sub(r"^\s+|\s+$", "", row['Name']),
                    'Party': sub(r"^\s+|\s+$", "", party_group),
                    'Branch': row['State'],
                    'DefaultState': 'Active'
                }

        all_listed_parties.append(party)
    
    shortlist_parties = []
    
    # Go through the rows, remove duplicates and apply shorter/known parent party labels
    for index, party in enumerate(all_listed_parties):
        duplicate = False
        # Compare all rows in search of the shortest identifying party name
        for compare_index, compare_party in enumerate(all_listed_parties):
            if (index != compare_index): # Dont compare to self
                if (party['Label'] != compare_party['Label']):
                    if (match(f"{compare_party['Label']}", f"{party['Label']}")):
                        party['Party'] = compare_party['Party'] # Party exists with parent
                        if DEBUG: print(f"Party {party['Label']} parent party changed to {compare_party['Label']}")
                        break
            
        # Discount already shortlisted parties (prevent duplicates)
        for shortlisted_party in shortlist_parties:
            if party['Label'] == shortlisted_party['Label']:
                duplicate = True

        if (duplicate == False):
            shortlist_parties.append(party)   
    
    print(f"{len(shortlist_parties)} parties shortlisted.")

    return shortlist_parties

def create_abbreviation(str_to_abbreviate):
    str_to_abbreviate = str_to_abbreviate.split()
    abbr = ''
    for word in str_to_abbreviate:
        if (word[0].isalpha()):
            abbr += word[0]

    return abbr

def enumerate_parties(all_parties):
    e_parties = []
    e_parties_initialled = []

    for label in all_parties:
        if label['Party'] not in e_parties:
            s_label = sub(r"^\s+|\s+$", "", label['Party'])
            e_parties.append(s_label)
            exp_party = {
                'Party': label['Party'],
                'Initialism': create_abbreviation(label['Party']),
                'Aliases': label['Label']
            }
            if (DEBUG): print(f"Party label ({exp_party['Initialism']})")

            # Check if party initialism already been used and notify
            for e_party in e_parties_initialled:
                if (exp_party['Initialism'] == e_party['Initialism']):
                    if (DEBUG): print(f"Party ({exp_party['Party']}) initials are already in use by {e_party['Party']} ({exp_party['Initialism']}).")
                    #Should probably do something about this?...
            
            e_parties_initialled.append(exp_party)
        else:
            for _exp_party in e_parties_initialled:
                if (_exp_party['Party'] == label['Party']):
                    if (DEBUG): print(f"Adding alias {label['Label']} to party: {_exp_party['Party']}")
                    _exp_party['Aliases'] += ";" + label['Label']


    # return parties or parties_initialled
    return e_parties_initialled

def discover_receipt_types(csv_data_file):
    print(f"Discovering (parsing) receipt types from {csv_data_file}.")

    csv_file = open_file(f"{csv_data_file}")
    receipt_data_dict = csv.DictReader(csv_file, delimiter=',')
    receipt_types = {'Public Funding': 0}

    i = 1
    for receipt in receipt_data_dict:
        if 'Receipt Type' in receipt and receipt['Receipt Type'] not in receipt_types:
            receipt_types[receipt['Receipt Type']] = i
            i = i + 1

    return receipt_types

def discover_public_entities():
    print("Discovering (parsing) public entities from file.")
    all_public_entities = []
    public_entities_file = open_file(f"{DATA_DIR}{USEFUL_DATA['PUBLIC_ENTITIES']}")
    public_entities_dict = csv.DictReader(public_entities_file, delimiter=',')

    for row in public_entities_dict:
        entity = {
                'Name': row['Name'],
                'Aliases': row['Aliases'],
            }

        all_public_entities.append(entity)

    
    print(f"Public entites count: {len(all_public_entities)}.")

    return all_public_entities

def munge_receipt_type(given_receipt_type, payer_name):
    # TODO: This needs to come from some entity/alias data, this is getting rediculous
    client = payer_name.lower()
    if client in (
        'australian taxation office',
        'aec',
        'australian tax office',
        'department of finance',
        'ato',
        'australian electoral commission',
        'australian electoral commision',
        'victorian electoral commission',
        'nsw electoral commission',
        'electoral commission of queensland',
        'western australian electoral commission (waec)',
        'act electoral commission',
        'electoral commission of south australia',
        'electoral commission of sa',
        'sa electoral commission',
        'electoral commission of qld',
        'electoral commision qld'
        'new south wales electoral commission',
        'australian electoral commission (act)',
        'nsw electoral commission',
        'dept finance',
        'elections act'
        ):        
        return 'Public Funding'
    elif 'electoral commission' in client:
        return 'Public Funding'
    elif 'electoral comission' in client:
        return 'Public Funding'
    else:
        return given_receipt_type

def find_entity_by_label_in_all(label, all_parties, third_parties, campaigners, associated_entities, all_public_entities):
    for index, party in enumerate(all_parties):
        if party['Party'].lower() == label.lower():
            return index, "Party"
        
        aliases = party['Aliases'].split(';')
        
        for alias in aliases:
            if label.lower() == alias.lower():
                return index, "Party"

    for index, third_party in enumerate(third_parties):
        if third_party['Name'].lower() == label.lower():
            return index, "Third_Party"

    for index, campaigner in enumerate(campaigners):
        if campaigner['Name'].lower() == label.lower():
            return index, "Campaigner"
    
    for index, associated_entity in enumerate(associated_entities):
        if associated_entity['Name'].lower() == label.lower():
            return index, "Associated Entity"

    for index, public_entity in enumerate(all_public_entities):
        if public_entity['Name'].lower() == label.lower():
            return index, "Public Entity"
        
        aliases = public_entity['Aliases'].split(';')
        
        for alias in aliases:
            if label.lower() == alias.lower():
                return index, "Public Entity"

    return -1, "unknown" # Entity doesnt match any known.

def process_detailed_receipts(csv_data_file, parties, third_parties, campaigners, associated_entities, all_public_entities):
    receipts = []

    csv_file = open_file(f"{csv_data_file}")
    receipt_data_dict = csv.DictReader(csv_file, delimiter=',')

    unknown_recipients = 0

    for receipt in receipt_data_dict:
        payer_name = receipt['Received From']#TODO: This needs to be matched with the entity data available
        recipient_trimmed = sub(TRIM_PATTERN, "", receipt['Recipient Name']) # Some entries have been stored with trailing spaces. Remove them.
        recipient_details = find_entity_by_label_in_all(recipient_trimmed, parties, third_parties, campaigners, associated_entities, all_public_entities)
        recipient_entity = recipient_details[0]
        recipient_entity_type = recipient_details[1]
        receipt_type = munge_receipt_type(receipt['Receipt Type'], payer_name)

        if recipient_entity == -1:
            unknown_recipients += 1
            unknown_receipt_recipients.append(recipient_trimmed)
            

        receipt = {
                     'Amount': receipt['Value'],
                     'Type': receipt_type,
                     'Recipient': recipient_details, # TODO: This will probably need to be embedded JSONlike
                     'Year': receipt['Financial Year'],
                     'Entity': payer_name, 
                   }

        receipts.append(receipt)

    print(f"Unknown receipt entites count: {unknown_recipients}.")

    return receipts

def clean_receipt_entities_with_known(receipt_entities, all_parties, third_parties, campaigners, associated_entities, all_public_entities):
    unfound_receipt_entities = []

    for receipt_entity in receipt_entities:
        receipt_entity_trimmed = sub(TRIM_PATTERN, "", receipt_entity['Name'])
        known_entity = find_entity_by_label_in_all(receipt_entity_trimmed, all_parties, third_parties, campaigners, associated_entities, all_public_entities)
        if known_entity[0] == -1:
            unfound_receipt_entities.append(receipt_entity)

    return unfound_receipt_entities


# Delete me
def save_unknown_receipt_recipients_to_file():
    out_data = {
        'unknown_entities': unknown_receipt_recipients
    }

    with open(FILE_TEMP_DATA, "w") as f:
        f.write(json.dumps(out_data))
    f.close()

if __name__ == "__main__":
    all_public_entities = discover_public_entities()
    all_parties = discover_parties() #use parent id 'Party Group'
    all_third_parties = discover_unique_items_from_csv("third parties", f"{DATA_DIR}{USEFUL_DATA['THIRD_PARTY_RETURNS']}",'Name', [], '')
    all_donors = discover_unique_items_from_csv("donors", f"{DATA_DIR}{USEFUL_DATA['DONOR_RETURNS']}",'Name', [], '')
    # NOTE: Total donations made lodged in returns may be interesting to compare to known receipted donations
    all_campaigners = discover_unique_items_from_csv("political campaigners", f"{DATA_DIR}{USEFUL_DATA['CAMPAIGNER_RETURNS']}",'Name', [], '')
    all_associated_entities = discover_unique_items_from_csv("associated entities", f"{DATA_DIR}{USEFUL_DATA['ASSOCIATED_RETURNS']}",'Name', ['Associated Party'], 'Lodged on behalf of')
    all_receipt_entities = discover_unique_items_from_csv("receipt entities", f"{DATA_DIR}{USEFUL_DATA['DETAILED_RECEIPTS']}",'Name', [], '')
    all_receipt_types = discover_receipt_types(f"{DATA_DIR}{USEFUL_DATA['DETAILED_RECEIPTS']}")
   
    out_data = {
        'parties': all_parties,
        'all_receipt_entities': all_receipt_entities,
    }

    with open(FILE_TEMP_DATA, "w") as f:
        f.write(json.dumps(out_data))
    f.close()
    
    all_parties = enumerate_parties(all_parties) #Update party list to link aliases and enumerate
    
    unknown_receipt_entities = clean_receipt_entities_with_known(all_receipt_entities, all_parties, all_third_parties, all_campaigners, all_associated_entities, all_public_entities)
    all_detailed_receipts = process_detailed_receipts(f"{DATA_DIR}{USEFUL_DATA['DETAILED_RECEIPTS']}", all_parties, all_third_parties, all_campaigners, all_associated_entities, all_public_entities)

    all_data = {
        'parties': all_parties,
        'third_parties':all_third_parties,
        'donors':all_donors,
        'political_campaigners': all_campaigners,
        'associated_entities': all_associated_entities,
        'unknown_receipt_entities': unknown_receipt_entities,
        'all_receipt_types': all_receipt_types,
        'receipts': all_detailed_receipts,
        'public_entities': all_public_entities
    }

    with open(FILE_ALL_DATA, "w") as f:
        f.write(json.dumps(all_data))
    f.close()
