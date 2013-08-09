from collections import defaultdict
import xml.etree.ElementTree as ET
import json
import locale

tree = ET.parse('../AnalysisPartyGroupTheGreens.xml')
root = tree.getroot()

payments = defaultdict(int)

locale.setlocale( locale.LC_ALL, '' )

for node in root:
    payments[node.find('PayerClientNm').text] += int(node.find('AmountReceived').text)

totalpayments = sum(payments.values())
nodes = [{'name':"Australian Greens Party", 
    'amount':locale.currency(totalpayments, grouping=True), 
    'playcount':totalpayments, 'id':'australian_greens_party'}]
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
   links.append({'source': "australian_greens_party", 'target': id})
   
print json.dumps({'nodes': nodes, 'links': links}, indent=2)

