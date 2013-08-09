#!/usr/bin/env python

from collections import defaultdict
from collections import namedtuple
import xml.etree.ElementTree as ET
import json
import locale

def xmltojson(filename, name, party_id):
  tree = ET.parse(filename)
  root = tree.getroot()

  payments = defaultdict(int)

  locale.setlocale( locale.LC_ALL, '' )

  for node in root:
      payments[node.find('PayerClientNm').text] += int(node.find('AmountReceived').text)

  totalpayments = sum(payments.values())
  nodes = [{'name':name, 
      'amount':locale.currency(totalpayments, grouping=True), 
      'playcount':totalpayments, 'id':party_id}]
  links = []
  for key, val in payments.iteritems():
     node = {}
     id = key.replace(' ', '_').lower()
     node['match'] = float(val) / totalpayments
     node['name'] = key
     node['amount'] = locale.currency(val, grouping=True)
     node['playcount'] = val
     node['id'] = id
     nodes.append(node)
     links.append({'source': id, 'target': party_id})
     
  fp = open(party_id + '.json', 'w')
  json.dump({'nodes': nodes, 'links': links}, fp, indent=2)

Party = namedtuple('Party', ['filename', 'name', 'party_id'])

parties = [
  Party("AnalysisPartyGroupAustralianLaborParty.xml", 
      "Australian Labor Party", "australian_labor_party"),
  Party("AnalysisPartyGroupTheGreens.xml", 
      "Australian Greens Party", "australian_greens_party"),
  Party("AnalysisPartyGroupLiberal.xml", 
      "Liberal Party", "liberal_party")
]

for party in parties:
  xmltojson(*party)

