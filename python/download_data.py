#!/usr/bin/env python

#from urllib import urlencode
#from urllib2 import urlopen
import mechanize, cookielib, xmltodict, json, csv

import os, re, httplib
#from bs4 import BeautifulSoup

PartyInfo = {}

def load_party_info():
    party_file = open("parties.txt", "r")

    csv_parties = csv.DictReader(party_file, delimiter='|')

    for party in csv_parties:
        PartyInfo[party['Label']] = {
            'Party': party['Party'],
            'ShowByDefault': True if party['DefaultState'] == 'Active' else False,
            'Branch': party['Branch']
        }

    party_file.close()


def download_data(url):
    httplib.HTTPConnection._http_vsn = 10
    httplib.HTTPConnection._http_vsn_str = 'HTTP/1.0'

    MECHANIZE_DEBUG=False

    info_to_retrieve = []
    files = []

    browser = mechanize.Browser()
    cookies = cookielib.LWPCookieJar()
    browser.set_cookiejar(cookies)

    #browser.set_handle_equiv(True)
    #browser.set_handle_gzip(False)
    #browser.set_handle_redirect(True)
    #browser.set_handle_referer(True)
    #browser.set_handle_robots(False)
    #browser.set_handle_refresh(mechanize._http.HTTPRefreshProcessor(), max_time=1)
    #browser.addheaders = [('User-agent', 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.1) Gecko/2008071615 Fedora/3.0.1-1.fc9 Firefox/3.0.1')]

    if MECHANIZE_DEBUG:
        import sys, logging
        logger = logging.getLogger("mechanize")
        logger.addHandler(logging.StreamHandler(sys.stdout))
        logger.setLevel(logging.DEBUG)
        browser.set_debug_http(True)
        #browser.set_debug_responses(True)
        #browser.set_debug_redirects(True)

    year_data = []
    parties_data = []

    response = browser.open(url)

    #browser.select_form(nr=1)
    for form in browser.forms():
        if form.attrs.get("id") == "formMaster":
            browser.form = form

    control = browser.form.find_control('ctl00$dropDownListPeriod')

    for item in control.items:
        year_data.append({
            'label': control.get_item_attrs(item.name)['label'],
            'value': control.get_item_attrs(item.name)['value']
        })

    x = year_data[-1]

    print x
    
    #for year in year_data:
    for year in (x, ):
        for form in browser.forms():
            if form.attrs.get("id") == "formMaster":
                browser.form = form
        #browser.select_form(nr=1)
        print "Retrieving data for " + year['label']
        browser[control.name] = [year['value'],]
    
        response = browser.submit()
        response = browser.follow_link(url='AnalysisParty.aspx')
        #browser.select_form(nr=1)
    
        for form in browser.forms():
            if form.attrs.get("id") == "formMaster":
                browser.form = form
        parties_select = browser.form.find_control('ctl00$ContentPlaceHolderBody$dropDownListParties')
    
        for item in parties_select.items:
            party_name = parties_select.get_item_attrs(item.name)['label']
            print "    Retrieving data for " + party_name + " for " + year['label']
    
            #browser.select_form(nr=1)
            for form in browser.forms():
                if form.attrs.get("id") == "formMaster":
                    browser.form = form
            browser[parties_select.name] = [parties_select.get_item_attrs(item.name)['value'],]
            browser.submit(label='Export')
    
            #browser.select_form(nr=1)
            for form in browser.forms():
                if form.attrs.get("id") == "formMaster":
                    browser.form = form
            browser['ctl00$ContentPlaceHolderBody$exportControl$dropDownListOptions'] = ['xml',]
            browser.submit(label='Continue')
    
            xml_data = browser.response()
    
            filename = xml_data.info()['content-disposition'].split(';')[1].split('=')[1]
            path = "data/%s" % (year['label'])
    
            if not os.path.exists(path):
                os.makedirs(path)
    
            filename = "%s/%s" % (path, filename.replace("xml", "json"))
            files.append(filename)

            data = xmltodict.parse(xml_data)

            if data['DocumentElement'] == None:
                data['DocumentElement'] = {}

            data['DocumentElement']['Year'] = year['label']
            data['DocumentElement']['Party'] = { 'Label': party_name,
                                                 'ShowByDefault': PartyInfo[party_name]['ShowByDefault'],
                                                 'Name':  PartyInfo[party_name]['Party'],
                                                 'Branch': PartyInfo[party_name]['Branch'] }
    
            f = open(filename, 'w')
            f.write(json.dumps(data['DocumentElement']))
    
            f.close()
            
            browser.back()

    return files
  
if __name__ == "__main__":
    url = 'http://periodicdisclosures.aec.gov.au/AnalysisParty.aspx'
    load_party_info()
    files = download_data(url)
