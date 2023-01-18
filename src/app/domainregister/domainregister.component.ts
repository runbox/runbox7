// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
// 
// This file is part of Runbox 7.
// 
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
// 
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { timeout } from 'rxjs/operators';
import { Component, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

export interface ElementUserDomain {
  created: string;
  expires: string;
  name: string;
  // domain_privacy: number;
  actions: string;
}

export interface ElementDnsSetting {
  name: string;            // domain string                    ex. ftp.runbox.com
  type: string;            // DNS entry type                   ex. A CNAME MX NS SRV
  address: string;         // ip                               ex. 192.0.0.1
  char_str_list: string;   // DKIM record                      ex. v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQE...DDAF
  class: string;           // dns class IN (internet)          ex. IN
  cname: string;           // alias for another domain         ex. other.runbox.com
  exchange: string;        //                                  ex. mx.runbox.com
  line: number;            // the dns setting line number      ex. 12
  nsdname: string;         // domain string                    ex. ns1.runbox.com
  port: number;            // port number                      ex. 443
  preference: number;      // int                              ex. 0
  priority: number;        // int                              ex. 0
  target: string;          // string                           ex. host03.runbox.net
  ttl: number;             // int                              ex. 14400
  txtdata: string;         // string                           ex. path=/
  weight: number;          // int                              ex. 0
}

export interface ElementTld {
  tld: string;
  period: string;
  price: string;
  supports_whois_privacy: number;
  privacy_price: string;
}

@Component({
  moduleId: 'angular2/app/domainregister/',
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'domain-register',
  templateUrl: 'domainregister.component.html'
})




export class DomainRegisterComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onClose: EventEmitter<string> = new EventEmitter();
  // @Input() messageActionsHandler : MessageActions;
  public relativeTop = '50%';
  public selected_product;
  public selected_privacy_product;
  public allows_whois_privacy = false;
  public selected_whois_privacy_option = false;
  public enable_whois = false;
  public is_checking_avaliability = false;
  public tld_list = [];
  public agreement_generic = null;
  public agreement_specific = null;
  public specific_docs = [];
  public domain_wanted = '';
  public is_available = null;
  public products_available = [];
  public privacy_products_available = [];
  public is_tld_list_visible = false;
  public selected_domain; // holds domain information of user selected domain
  public is_loading = {
    dns_settings: false,
    tld_list: false,
  };
  private user_domains = [];
  public is_agreement_checked = false;
  public is_specific_agreement_checked = false;
  public is_btn_purchase_disabled = false;
  public is_btn_search_domain_disabled = false;
  public required_fields = {};
  public domreg_hash;
  public is_purchase_privacy = false;
  public purchase_privacy;
  public is_renew_domain = false;
  public renew_domain;
  public privacy_domain;
  public domain_info = {};
  public tlds_by_hash = {};
  public selectedTabNum = 1;
  public domreg_data = undefined;

  public displayedColumns = ['position', 'name', 'weight',
    // 'symbol', 
    'actions'];
  public dataSourceUserDomains = new MatTableDataSource<ElementUserDomain>(this.user_domains);
  public required_by = {};

  private domain_dns_settings = [];

  public displayedColumnsDNS = ['name', 'type', 'address', 'ttl', 'action'];
  public dataSourceDNS = new MatTableDataSource<ElementDnsSetting>(this.domain_dns_settings);

  public displayedColumnsTld = [
    'tld',
    'period',
    'price',
    'requires_ext_attributes',
    'supports_whois_privacy',
    'privacy_price'
  ];
  public dataSourceTld: MatTableDataSource<ElementTld>;
  public generic_docs = null;

  public regex = {
    domain: /^[a-z\d\-]+\..+$/,
    sld: /^[a-z\d\-]+$/,
    tld: /^[a-z\d\-]+(\.([a-z\d\-\.])+)?$/
  };

  public renewal_selected_product = {};
  public renewal_total_price;
  public renewal_option_supports_whois_privacy = false;
  public renew_whois_privacy = [];
  public is_btn_renew_disabled = true;

  public is_trial = false;

  public domain_quota_allowed = 0;
  public domain_quota_used = 0;

  public btn_check_avail_color = function () {
    return this.is_available ? 'primary' : 'button';
  };

  public calculate_total = function () {
    // eslint-disable-next-line no-eval
    this.total_price = eval(this.selected_product.price[0].price);
    // eslint-disable-next-line no-eval
    if ( this.selected_privacy_product && eval(this.selected_privacy_product)) {
      // eslint-disable-next-line no-eval
      this.total_price = this.total_price + eval(this.privacy_products_available[this.selected_product.subscription_interval].price);
    }
    this.total_price = parseFloat(this.total_price).toFixed(2);
  };

  public is_data_validated = function () {
    // check user accepted agreement
    if (this.agreement_generic && !this.is_agreement_checked) {
      this.show_error('Please check the agreement checkbox', 'Dismiss');
      return false;
    }
    // check user accepted specific agreement
    if (this.agreement_specific && !this.is_specific_agreement_checked) {
      this.show_error('Please check the specific agreement checkbox', 'Dismiss');
      return false;
    }
    // check user filled in documents

    // check user filled in special documents
  };

  public is_tld_valid = function () {
    if (this.domreg_hash) { return true; }
    const rgx = '\\.(' + this.tld_list.join('|') + ')$';
    const rgx_tld = new RegExp(rgx);
    const result = this.domain_wanted.match(rgx_tld);
    return result;
  };

  public check_avail = function () {
    if (this.is_btn_search_domain_disabled) { return; }
    if ( this.domain_quota_used && this.domain_quota_allowed && this.domain_quota_used >= this.domain_quota_allowed ) {
        return this.show_error('You have reached your allowed Email Domain quota. Please purchase more Email Hosting products.', 'Dismiss');
    }
    this.is_btn_search_domain_disabled = true;
    this.is_available_error_msg = undefined;
    this.selected_product = undefined;
    this.selected_privacy_product = undefined;
    if (!this.is_tld_valid()) {
      this.is_btn_search_domain_disabled = false;
      return this.show_error('The top level domain (TLD) you selected is invalid.' +
      ' Please check the available ones and check again.', 'Dismiss');
    }
    this.is_available = null;
    const d = this.parse_domain_wanted();
    if (!d || !d.sld || !d.tld) {
      return this.show_error('The domain you selected is in invalid format or has invalid characters. ' +
            'Example of format: xyz.com xyz.co.uk', 'Dismiss');
    }
    const sld = d.sld;
    const tld = d.tld;
    this.is_checking_avaliability = true;
    this.is_available = undefined;
    this.is_agreement_checked = false;
    this.is_specific_agreement_checked = false;

    this.http.post('/rest/v1/domain_registration/enom/check_avail', {
      sld: sld,
      tld: tld
    })
      .pipe(timeout(60000))
      .subscribe(
        (reply: any) => {
          this.is_btn_search_domain_disabled = false;
          if (!reply) { return this.show_error('Error! Please try again.', 'Dismiss'); }
          if (reply.status === 'error') { return this.show_error(reply.errors.join('; ')); }
          if (reply.result.is_available === 1) {
            this.is_available = true;
            this.is_available_msg = 'This domain is available!';
          }
          if (reply.result.is_available === 0) {
            this.is_available = false;
            this.is_available_msg = 'We are sorry but this domain is not available!';
          }
          this.is_checking_avaliability = false;
          this.products_available = reply.result.products;
          this.privacy_products_available = reply.result.privacy_products;
          this.get_agreement();
          this.get_specific_docs();
          this.get_generic_docs();
          return;
        },
        error => {
          this.is_btn_search_domain_disabled = false;
          this.is_checking_avaliability = false;
          return this.show_error('Error checking if domain is available! Please try again.', 'Dismiss');
        }
      );
    return;
  };

  public create_product_label = function (product) {
    if (product) {
      return [
        product.subscription_interval,
        product.subscription_unit,
        '(' + product.price[0].currency,
        '$' + product.price[0].price + ')'
      ].join(' ');
    }
  };

  public get_selected_product_price = function () {
    if (!this.selected_product) { return; }
    return [
      this.selected_product.price[0].currency,
      this.selected_product.price[0].price
    ].join(' ');
  };

  public parse_domain_wanted = function () {
    const match = this.domain_wanted.match(/^([^\.]+)\.(.+)$/);
    if (!match) { return {}; }
    const sld = match[1];
    const tld = match[2];
    return { sld: sld, tld: tld };
  };

  public get_agreement = function () {
    this.agreement_generic = null;
    this.agreement_specific = null;
    const d = this.parse_domain_wanted();
    this.http.post('/rest/v1/domain_registration/enom/tld_agreement', {
      tld: d.tld
    }).pipe(timeout(60000))
      .subscribe(
        (reply: any) => {
          if (!reply) { return this.show_error('Error! Please try again.', 'Dismiss'); }
          if (reply.status === 'error') { return this.show_error(reply.errors.join('; ')); }
          this.agreement_generic = reply.result.agreement.generic;
          this.agreement_specific = reply.result.agreement.specific;
        },
        error => {
          return this.show_error('Error downloading agreement! Please try again.', 'Dismiss');
        }
      );
  };

  public get_generic_docs = function () {
    this.generic_docs = null;
    this.http.post('/rest/v1/domain_registration/enom/tld_docs_generic', {}).pipe(timeout(60000))
      .subscribe(
        (reply: any) => {
          if (!reply) { return this.show_error('Error! Please try again.', 'Dismiss'); }
          if (reply.status === 'error') { return this.show_error(reply.errors.join('; ')); }
          this.generic_docs = reply.result.generic_docs;
          if (this.domreg_data) {
            this.load_domreg_hash_data_generic_docs();
          }
        },
        error => {
          return this.show_error('Error downloading generic TLD documents! Please try again.', 'Dismiss');
        }
      );
  };

  public get_specific_docs = function () {
    this.specific_docs = null;
    const d = this.parse_domain_wanted();
    this.http.post('/rest/v1/domain_registration/enom/tld_docs', {
      tld: d.tld
    }).pipe(timeout(60000))
      .subscribe(
        (reply: any) => {
          if (!reply) { return this.show_error('Error! Please try again.', 'Dismiss'); }
          if (reply.status === 'error') { return this.show_error(reply.errors.join('; ')); }
          this.specific_docs = reply.result.specific_docs;
          if (this.domreg_data) { this.load_domreg_hash_data_specific_docs(); }
        },
        error => {
          return this.show_error('Error downloading specific TLD documents! Please try again.', 'Dismiss');
        }
      );
  };

  public update_specific_doc_value = function (ev, docs) {
    if (docs.type === 'select') {
      // check if the value will require an other field to be filled.
      // loop on each option and check which docs.options contains the value
      const selected_value = docs.value;
      if (docs.field === 'RegistrantCountry') {
        const country = docs.value;
        const zip_code_regex = this.zip_code_regex_by_country()[country];
        this.get_docs_hash().RegistrantPostalCode.pattern = '^.+$';
        this.get_docs_hash().RegistrantPostalCode.sublabel = '';
        if (zip_code_regex) {
          this.get_docs_hash().RegistrantPostalCode.pattern = zip_code_regex.regex;
          this.get_docs_hash().RegistrantPostalCode.sublabel = '( examples ' + zip_code_regex.examples.join(', ') + ' )';
        }
      }
      if (this.required_by[docs.name]) {
        // remove required fields
        for (let i = 0, item; item = this.required_by[docs.name][i++];) {
          this.required_fields[item] = 0;
        }
      }
      this.required_by[docs.name] = [];
      for (let i = 0, option; option = docs.options[i++];) {
        if (option.value === selected_value) {
          if (option.requires && option.requires.length) {
            for (let j = 0, req_field; req_field = option.requires[j++];) {
              this.required_fields[req_field.name] = 1;
              this.required_by[docs.name].push(req_field.name);
            }
          }
        }
      }
    }

  };

  public update = function () {
    this.is_btn_update_disabled = true;
    if (this.validate()) {
      const values = {
        docs: this.get_docs_values(),
        docs_specific: this.get_specific_docs_values(),
      };
      this.http.post('/rest/v1/domain_registration/enom/domreg_hash/' + this.domreg_hash, values)
        .pipe(timeout(6000))
        .subscribe(
          (reply: any) => {
            this.is_btn_update_disabled = false;
            if (reply.status === 'success') {
              this.show_error(reply.result.msg, 'Dismiss');
            } else {
              this.show_error('Could not update information. Please try again.', 'Dismiss');
            }
          }
        );

    }
  };

  public purchase = function () {
    this.is_btn_purchase_disabled = true;

    if (this.validate()) {
      const products_selected = [this.selected_product.pid];
      // eslint-disable-next-line no-eval
      if ( this.selected_privacy_product && eval(this.selected_privacy_product)) {
        products_selected.push(this.privacy_products_available[this.selected_product.subscription_interval].id);
      }
      const d = this.parse_domain_wanted();
      const purchase = {
        accepted_agreement_generic: (this.is_agreement_checked ? 1 : 0),
        products: products_selected,
        docs: this.get_docs_values(),
        docs_specific: this.get_specific_docs_values(),
        // eslint-disable-next-line no-eval
        total_price: eval(this.total_price), // value diplayed to user must match total value calculated on backend
        tld: d.tld,
        sld: d.sld,
        domain: this.domain_wanted,
      };

      if (this.agreement_specific) {
        purchase['accepted_agreement_specific'] = (this.is_specific_agreement_checked ? 1 : 0);
      }

      this.http.post('/rest/v1/domain_registration/enom/purchase', purchase)
        .pipe(timeout(6000))
        .subscribe(
          (reply: any) => {
            this.is_btn_purchase_disabled = false;
            if (reply.status === 'error' || !reply.location) {
              if (reply.errors && reply.errors[0].length) {
                return this.show_error('There was an error. ' + reply.errors.join('. '), 'Dismiss');
              } else {
                return this.show_error('There was an error. Please check the form fields and try again.', 'Dismiss');
              }
            }
            window.location.href = reply.location;
          },
          error => {
            this.is_btn_purchase_disabled = false;
            return this.show_error('There was an error. Please try again.', 'Dismiss');
          }
        );
    } else {
      this.is_btn_purchase_disabled = false;
    }
  };

  public get_specific_docs_values = function () {
    const docs = {};
    if (this.specific_docs && this.specific_docs.length) {
      for (let i = 0, doc; doc = this.specific_docs[i++];) {
        if (this.is_doc_required(doc)) {
          docs[doc.name] = doc.value;
        }
      }
    }
    return docs;
  };

  public get_docs_values = function () {
    const docs = {};
    for (let i = 0, item; item = this.generic_docs[i++];) {
      if (item.type === 'text' || item.type === 'select') {
        docs[item.field] = item.value;
      }
    }
    return docs;
  };

  public get_specific_docs_hash = function () {
    const docs = {};
    for (let i = 0, item; item = this.specific_docs[i++];) {
      docs[item.name] = item;
    }
    return docs;
  };

  public get_docs_hash = function () {
    const docs = {};
    for (let i = 0, item; item = this.generic_docs[i++];) {
      docs[item.field] = item;
    }
    return docs;
  };

  public validate = function () {
    if (!this.domreg_hash) {
      if (!this.is_validated_agreement()) { return; }
      if (!this.is_validated_agreement_specific()) { return; }
      if (!this.is_product_selected()) { return; }
      if (!this.is_privacy_selected()) { return; }
    }
    if (!this.is_validated_docs()) { return; }
    if (!this.is_validated_specific_docs()) { return; }
    return true;
  };

  public is_privacy_selected() {
    if (
      this.selected_product
      && this.selected_product.partner_product
      && this.selected_product.partner_product.supports_whois_privacy
      && typeof this.selected_privacy_product === 'undefined') { // is privacy available and not selected
      this.show_error('Please select if you want privacy enabled on your domain', 'Dismiss');
      return false;
    }
    return true;
  }

  public is_product_selected() {
    if (!this.selected_product) {
      this.show_error('Please select how many years you want for this domain', 'Dismiss');
      return false;
    }
    return true;
  }

  public is_validated_docs() {
    for (let i = 0, item; item = this.generic_docs[i++];) {
      if ((item.type === 'text' || item.type === 'select')) {
        if (item.is_required) {
          if (item.value == null || typeof item.value === 'undefined' || !item.value.length) {
            this.show_error('Please fill in all the Registrant details. Check field ' + item.label + '.', 'Dismiss');
            return false;
          }
        }
        if (item.pattern && item.value && item.value.length) {
          const rgx = new RegExp(item.pattern);
          if (!item.value.match(rgx)) {
            this.show_error('The format is wrong for field: ' + item.label, 'Dismiss');
            return false;
          }
        }
      }
    }
    return true;
  }

  public is_normal_doc_required(doc) {
    const docs_values = this.get_docs_values();
    if (doc.field === 'RegistrantFax' || doc.field === 'RegistrantJobTitle') {
      // if organizationname is defined, jobtitle and fax must be set
      if (docs_values['RegistrantOrganizationName'] && docs_values['RegistrantOrganizationName'].length) {
        doc.is_required = true;
      } else {
        doc.is_required = false;
      }
    }
    if (doc.is_required) { return true; }
    return false;
  }

  public is_doc_required(doc) {
    if (this.required_fields[doc.name] || doc.required === '1' || doc.type === 'select') {
      return true;
    }
    return false;
  }

  public is_validated_specific_docs() {
    if (this.specific_docs && this.specific_docs.length) {
      for (let i = 0, doc; doc = this.specific_docs[i++];) {
        if ((this.is_doc_required(doc)) &&
          (doc.value === '' || typeof doc.value === 'undefined')) {
          const error_msg = [
            'Please fill the additional data required for',
            this.parse_domain_wanted()['tld'],
            'TLDs to continue.'
          ].join(' ');
          this.show_error(error_msg, 'Dismiss');
          return false;
        }
      }
    }
    return true;
  }

  public is_validated_agreement() {
    if (this.agreement_generic && !this.is_agreement_checked) {
      this.show_error('Please accept the agreement to continue.', 'Dismiss');
      return false;
    }
    return true;
  }

  public is_validated_agreement_specific() {
    if (this.agreement_specific && !this.is_specific_agreement_checked) {
      const error_msg = [
        'Please accept the agreement for',
        this.parse_domain_wanted()['tld'],
        'TLDs to continue.'
      ].join(' ');
      this.show_error(error_msg, 'Dismiss');
      return false;
    }
    return true;
  }

  public show_error = function (message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  };

  public activate_purchase_privacy () {
      const is_purchase_privacy = window.location.href.match(/purchase_privacy=([^&]+)/);
      if ( is_purchase_privacy && is_purchase_privacy[1] ) {
        console.log('purchase privacy');
        this.is_purchase_privacy = true;
        const domain = is_purchase_privacy[1];
        console.log(domain);
        this.get_domain_info(domain);
        this.privacy_domain = is_purchase_privacy[1];
      }
  }

  public tld_list_update_price(tld, period) {
    tld.price = period.price;
    tld.supports_whois_privacy = period.supports_whois_privacy;
    tld.whois_privacy = period.whois_privacy;
  }

  public load_domreg_hash() {
    const hash = window.location.href.match(/domreg_hash=([^&]+)/);
    if (hash && hash[1]) {
      this.domreg_hash = hash[1];
      const headers = new HttpHeaders();
      headers.append('Accept', 'application/json');
      const url = '/rest/v1/domain_registration/enom/domreg_hash/' + this.domreg_hash;
      this.http.get(url, { headers: headers }).pipe(
        timeout(60000))
        .subscribe((r: any) => {
          if (r.status === 'success') {
            this.domain_wanted = r.result.data.domain;
            this.domreg_data = r;
            this.check_avail();
          } else {
            this.show_error('Could not load domain details. Please try again.', 'Dismiss');
          }
        });
    }
  }

  public activate_renew_domain() {
    const is_renew_domain = window.location.href.match(/renew_domain=([^&]+)/);
    if (is_renew_domain && is_renew_domain[1]) {
      this.is_renew_domain = true;
      this.renew_domain = is_renew_domain[1];
      this.get_domain_info(this.renew_domain);
    }
  }

  public get_domain_info ( domain ) {
      this.http.get('/rest/v1/domain_registration/enom/domain_info/' + domain)
        .pipe(timeout(60000))
        .subscribe((r: any) => {
            if ( r.status === 'success' ) {
                this.domain_info = r.result;
                this.selectedTabNum = 0;
                console.log(this.domain_info);
            } else {
                this.show_error('Could not find domain', 'Dismiss');
            }
        });
  }

  public is_registration_status_rgp () {
    if ( this.domain_info && this.domain_info['registration_status'] ) {
        return  this.domain_info['registration_status'].match(/registered|expired/ig);
        }
    return false;
  }

  public update_renewal_whois_privacy_options(option) {
    this.renew_whois_privacy = [
      {
        text: 'With WHOIS Privacy',
        value: 1,
        price: parseFloat(option.price).toFixed(2),
        id: option.id
      }, {
        text: 'Without WHOIS Privacy',
        value: 0
      }
    ];
  }

  public update_renewal_price(type, option) {
    delete this.renewal_selected_product[type];
    if (option && option.price) {
      this.renewal_selected_product[type] = option;
      if (type === 'domain') {
        this.renewal_option_supports_whois_privacy = false;
        if (option.supports_whois_privacy) {
          this.renewal_option_supports_whois_privacy = true;
          this.update_renewal_whois_privacy_options(option.whois_privacy);
        }
      }
    }
    this.renewal_total_price = 0;
    // eslint-disable-next-line guard-for-in
    for (const prod_type in this.renewal_selected_product) {
      this.renewal_total_price += parseFloat(this.renewal_selected_product[prod_type].price);
    }
    this.renewal_total_price = parseFloat(this.renewal_total_price).toFixed(2);
    if ( this.renewal_selected_product['domain'] ||
        (this.is_purchase_privacy && this.renewal_selected_product['whois_privacy'])
    ) {
      this.is_btn_renew_disabled = false;
    }
  }

  public btn_renew() {
    this.is_btn_renew_disabled = true;
    const renew = {
      domain: this.renew_domain,
      products: [],
    };
    if (this.renewal_selected_product['domain']) {
      renew.products.push(this.renewal_selected_product['domain'].id);
    }
    if (this.renewal_selected_product['whois_privacy']) {
      renew.products.push(this.renewal_selected_product['whois_privacy'].id);
    }
    // eslint-disable-next-line no-eval
    renew['total_price'] = eval(this.renewal_total_price);
    renew['sld'] = renew.domain.match(/^([^\.]+)\.(.+)$/)[1];
    renew['tld'] = renew.domain.match(/^([^\.]+)\.(.+)$/)[2];

    this.http.post('/rest/v1/domain_registration/enom/renew', renew).pipe(
      timeout(6000))
      .subscribe(
        (reply: any) => {
          this.is_btn_renew_disabled = false;
          if (reply.status === 'error' || !reply.location) {
            if (reply.errors) {
              return this.show_error(reply.errors.join('. '), 'Dismiss');
            } else {
              return this.show_error('There was an error. Please try again.', 'Dismiss');
            }
          }
          window.location.href = reply.location;
        },
        error => {
          this.is_btn_renew_disabled = false;
          return this.show_error('There was an error. Please try again.', 'Dismiss');
        }
      );
  }

  public btn_renew_autorenew () {
    this.btn_renew();
  }

  public btn_purchase_privacy () {
    this.is_btn_renew_disabled = true;
    const purchase = {
        domain : this.privacy_domain,
        products : [],
    };
    console.log('purchase', purchase);
    console.log('renewal_selected_product', this.renewal_selected_product);
    if ( this.renewal_selected_product['whois_privacy'] ) {
        purchase.products.push(this.renewal_selected_product['whois_privacy'].id);
    }
    // eslint-disable-next-line no-eval
    purchase['total_price'] = eval(this.renewal_total_price);
    purchase['sld'] = purchase.domain.match(/^([^\.]+)\.(.+)$/)[1];
    purchase['tld'] = purchase.domain.match(/^([^\.]+)\.(.+)$/)[2];
    console.log('purchase', purchase);
    const post_purchase_privacy = this.http.post('/rest/v1/domain_registration/enom/purchase_privacy', purchase);
    post_purchase_privacy.pipe(
    timeout(6000))
    .subscribe(
        (reply: any) => {
          this.is_btn_renew_disabled = false;
          if ( reply.status === 'error' || ! reply.location ) {
            if ( reply.errors ) {
                return this.show_error(reply.errors.join('. '), 'Dismiss');
            } else {
                return this.show_error('There was an error. Please try again.', 'Dismiss');
            }
          }
          window.location.href = reply.location;
        },
        error => {
            this.is_btn_renew_disabled = false;
            return this.show_error('There was an error. Please try again.', 'Dismiss');
        }
    );
  }

  public is_tab_active(tabname) {
    if ( this.is_purchase_privacy && tabname === 'purchase_privacy' ) { return true; }
    return false;
  }

  public load_domreg_hash_data_generic_docs() {
    // eslint-disable-next-line guard-for-in
    for (const k in this.domreg_data.result.data.docs) {
      const docs_values = this.get_docs_hash();
      if (docs_values) {
        docs_values[k].value = this.domreg_data.result.data.docs[k];
      }
    }
  }

  public load_domreg_hash_data_specific_docs() {
    const docs_hash = this.get_specific_docs_hash();
    for (const k in this.domreg_data.result.data.docs_specific) {
      if (docs_hash) {
        docs_hash[k].value = this.domreg_data.result.data.docs_specific[k];
      }
    }
  }

  public check_quota() {
    const req = this.http.get('/rest/v1/email_hosting/domains_quota');
    req.pipe(timeout(180000))
      .subscribe((result: any) => {
        this.domain_quota_allowed = result.result.domain_quota_allowed;
        this.domain_quota_used = result.result.domain_quota_used;
        if ( this.domain_quota_used >= this.domain_quota_allowed ) {
            this.show_error('You have reached your allowed Email Domain quota. Please purchase more Email Hosting products.', 'Dismiss');
        }
      },
        error => {
          return this.show_error('Could not get Email Domain quota.', 'Dismiss');
        }
      );
  }

  constructor(
    private http: HttpClient,
    public snackBar: MatSnackBar,
    private rmmapi: RunboxWebmailAPI,
  ) {
    this.is_loading.tld_list = true;
    this.dataSourceTld = new MatTableDataSource<ElementTld>();
    const req_tld_list = this.http.get('/rest/v1/domain_registration/enom/tld_list');
    req_tld_list.pipe(
      timeout(180000))
      .subscribe((result: any) => {
        this.dataSourceTld.data = result.result.product_list;
        this.is_loading.tld_list = false;
        for (let i = 0, item; item = result.result.product_list[i++];) {
          this.tld_list.push(item.tld);
        }
      },
        error => {
          return this.show_error('Could not list Top Level Domains', 'Dismiss');
        }
      );
    this.check_quota();
    req_tld_list.subscribe(result => {
      this.load_domreg_hash();
      this.activate_renew_domain();
      this.activate_purchase_privacy();
    });
    //    this.list_hosted_domains();
    this.rmmapi.me.subscribe(me => {
      this.is_trial = me.is_trial;
    });
  }

  // public close(actionstring? : string) {    
  //  this.relativeTop = "100%";
  //  // Allow some time for CSS transition
  //  setTimeout(() => {
  //    this.messageId = null;      
  //    if(this.onClose) {
  //      this.onClose.emit(actionstring);
  //    }
  //  },200);
  //  
  // }

  // public show_domain_details(domain) {
  //  this.selected_domain = domain;
  //  this.show_domain_dns_details(domain);
  // }

  // public show_domain_dns_details(domain) {
  //  this.is_loading.dns_settings = true;
  //  this.dataSourceDNS = new MatTableDataSource<ElementDnsSetting>([]);
  //  this.http.get("/rest/v1/hosted_domain/dns/"+domain.name,{
  //    })
  //    .timeout(60000) 
  //  .subscribe(
  //      data => {
  //        this.is_loading.dns_settings = false;
  //        var reply = data
  //        if ( reply.status == 'success' ) {
  //          this.update_data_source_dns(reply.result.dns);
  //        } else {
  //          this.show_error((reply.errors[0] || "Error loading"),'Dismiss');
  //        }
  //      },
  //      error => { 
  //          this.is_loading.dns_settings = false;
  //          return this.show_error("Could not list your domain DNS details.", 'Dismiss')
  //      }
  //  );
  // }

  // private update_data_source_dns(data) {
  //  this.dataSourceDNS = new MatTableDataSource<ElementDnsSetting>(data);
  // }

  // public add_dns_setting_row() {
  //  this.dataSourceDNS._data._value.push({type: 'A'})
  //  this.update_data_source_dns(this.dataSourceDNS._data._value)
  // }

  // public delete_dns_setting_row(index, element) {
  //  this.dataSourceDNS._data._value[index].is_deleted = 1 //mark as deleted
  //  this.update_data_source_dns(this.dataSourceDNS._data._value)
  // }

  applyFilterTLD(filterValue: string) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.dataSourceTld.filter = filterValue;
  }

  // public save_dns_settings() {
  //  var settings = this.dataSourceDNS._data._value;
  //  this.http.put("/rest/v1/hosted_domain/dns/"+domain.name,{
  //    })
  //    .timeout(60000) 
  //  .subscribe(
  //      data => {
  //        this.is_loading.dns_settings = false;
  //        var reply = data
  //        if ( reply.status == 'success' ) {
  //          this.update_data_source_dns(reply.result.dns);
  //        } else {
  //          this.show_error((reply.errors[0] || "Error loading"),'Dismiss');
  //        }
  //      },
  //      error => { 
  //          this.is_loading.dns_settings = false;
  //          return this.show_error("Could not list your domain DNS details.", 'Dismiss')
  //      }
  //  );


  // }

  // public tld_list() {
  //  return {
  //      show () { this.is_tld_list_visible = true },
  //      hide () { this.is_tld_list_visible = false }
  //  }
  // }

  // public get messageId() {
  //  return this._messageId;
  // }    

  ngAfterViewInit() {
    this.dataSourceTld.paginator = this.paginator;
  }

  zip_code_regex_by_country() {
    // from https://unicode.org/cldr/trac/browser/tags/release-27/common/supplemental/postalCodeData.xml
    return {
      GB: {
        // eslint-disable-next-line max-len
        regex: 'GIR[ ]?0AA|((AB|AL|B|BA|BB|BD|BH|BL|BN|BR|BS|BT|CA|CB|CF|CH|CM|CO|CR|CT|CV|CW|DA|DD|DE|DG|DH|DL|DN|DT|DY|E|EC|EH|EN|EX|FK|FY|G|GL|GY|GU|HA|HD|HG|HP|HR|HS|HU|HX|IG|IM|IP|IV|JE|KA|KT|KW|KY|L|LA|LD|LE|LL|LN|LS|LU|M|ME|MK|ML|N|NE|NG|NN|NP|NR|NW|OL|OX|PA|PE|PH|PL|PO|PR|RG|RH|RM|S|SA|SE|SG|SK|SL|SM|SN|SO|SP|SR|SS|ST|SW|SY|TA|TD|TF|TN|TQ|TR|TS|TW|UB|W|WA|WC|WD|WF|WN|WR|WS|WV|YO|ZE)(\\d[\\dA-Z]?[ ]?\\d[ABD-HJLN-UW-Z]{2}))|BFPO[ ]?\\d{1,4}',
        examples: ['HP8D5QS', 'NP40EO', 'GIR0AA', 'GIR0AA', 'HS1 0DE']
      },
      JE:
      {
        regex: 'JE\\d[\\dA-Z]?[ ]?\\d[ABD-HJLN-UW-Z]{2}',
        examples: ['JE3U 1DE', 'JE5V 1AF', 'JE3 0BU', 'JE6Z7WZ', 'JE00YG']
      },
      GG:
      {
        regex: 'GY\\d[\\dA-Z]?[ ]?\\d[ABD-HJLN-UW-Z]{2}',
        examples: ['GY9I7XW', 'GY0 6UN', 'GY65RY', 'GY57DW', 'GY1V 9TS']
      },
      IM:
      {
        regex: 'IM\\d[\\dA-Z]?[ ]?\\d[ABD-HJLN-UW-Z]{2}',
        examples: ['IM4 6BF', 'IM74YO', 'IM3 4XU', 'IM87 3DD', 'IM5H 3PT']
      },
      US:
      {
        regex: '\\d{5}([ \\-]\\d{4})?',
        examples: ['18783-6714', '29577', '96524', '25083', '51982 2079']
      },
      CA:
      {
        regex: '[ABCEGHJKLMNPRSTVXY]\\d[ABCEGHJ-NPRSTV-Z][ ]?\\d[ABCEGHJ-NPRSTV-Z]\\d',
        examples: ['H8M2R1', 'T2T 4J2', 'L6R3E6', 'B1Y0K5', 'K0P 0T1']
      },
      DE:
      {
        regex: '\\d{5}',
        examples: ['20940', '88714', '63103', '60701', '23866']
      },
      JP:
      {
        regex: '\\d{3}-\\d{4}',
        examples: ['806-8559', '632-8475', '303-3821', '718-6179', '046-3321']
      },
      FR:
      {
        regex: '\\d{2}[ ]?\\d{3}',
        examples: ['46857', '05 808', '50 488', '89860', '42 416']
      },
      AU:
      {
        regex: '\\d{4}',
        examples: ['4316', '3075', '3599', '3148', '0461']
      },
      IT:
      {
        regex: '\\d{5}',
        examples: ['76633', '56625', '77878', '22433', '10736']
      },
      CH:
      {
        regex: '\\d{4}',
        examples: ['0113', '9981', '2308', '3683', '9319']
      },
      AT:
      {
        regex: '\\d{4}',
        examples: ['8490', '7713', '9163', '0083', '4204']
      },
      ES:
      {
        regex: '\\d{5}',
        examples: ['25106', '00101', '87279', '56274', '42126']
      },
      NL:
      {
        regex: '\\d{4}[ ]?[A-Z]{2}',
        examples: ['2388 OS', '7038 HN', '4559 OC', '6335DE', '9837ZO']
      },
      BE:
      {
        regex: '\\d{4}',
        examples: ['5174', '1364', '6184', '1238', '9037']
      },
      DK:
      {
        regex: '\\d{4}',
        examples: ['7687', '8817', '3263', '7633', '1138']
      },
      SE:
      {
        regex: '\\d{3}[ ]?\\d{2}',
        examples: ['168 63', '975 70', '26391', '366 16', '849 45']
      },
      NO:
      {
        regex: '\\d{4}',
        examples: ['2032', '7857', '2712', '3232', '7428']
      },
      BR:
      {
        regex: '\\d{5}[\\-]?\\d{3}',
        examples: ['63090-770', '05211-085', '55832-062', '52313760', '67502262']
      },
      PT:
      {
        regex: '\\d{4}([\\-]\\d{3})?',
        examples: ['5535', '7266', '8371', '0304', '8981']
      },
      FI:
      {
        regex: '\\d{5}',
        examples: ['34651', '93042', '57096', '05860', '28589']
      },
      AX:
      {
        regex: '22\\d{3}',
        examples: ['22519', '22532', '22323', '22189', '22130']
      },
      KR:
      {
        regex: '\\d{3}[\\-]\\d{3}',
        examples: ['080-950', '670-080', '409-925', '289-661', '549-754']
      },
      CN:
      {
        regex: '\\d{6}',
        examples: ['044739', '208532', '929119', '871017', '461495']
      },
      TW:
      {
        regex: '\\d{3}(\\d{2})?',
        examples: ['67978', '553', '218', '138', '84771']
      },
      SG:
      {
        regex: '\\d{6}',
        examples: ['353578', '071602', '320381', '848379', '296364']
      },
      DZ:
      {
        regex: '\\d{5}',
        examples: ['03257', '32929', '85614', '81607', '90663']
      },
      AD:
      {
        regex: 'AD\\d{3}',
        examples: ['AD096', 'AD706', 'AD152', 'AD983', 'AD635']
      },
      AR:
      {
        regex: '([A-HJ-NP-Z])?\\d{4}([A-Z]{3})?',
        examples: ['9166LFB', 'R0137NUM', '7582IAG', 'C1776', 'P5748']
      },
      AM:
      {
        regex: '(37)?\\d{4}',
        examples: ['373627', '1640', '4600', '376321', '7192']
      },
      AZ:
      {
        regex: '\\d{4}',
        examples: ['2163', '9199', '8389', '8987', '5032']
      },
      BH:
      {
        regex: '((1[0-2]|[2-9])\\d{2})?',
        examples: ['303', '', '', '1286', '']
      },
      BD:
      {
        regex: '\\d{4}',
        examples: ['2512', '7121', '5485', '1403', '6169']
      },
      BB:
      {
        regex: '(BB\\d{5})?',
        examples: ['', '', 'BB24323', '', '']
      },
      BY:
      {
        regex: '\\d{6}',
        examples: ['334088', '801652', '041810', '266633', '564068']
      },
      BM:
      {
        regex: '[A-Z]{2}[ ]?[A-Z0-9]{2}',
        examples: ['LD 2I', 'AO X5', 'WAGM', 'XH 8X', 'LI 7N']
      },
      BA:
      {
        regex: '\\d{5}',
        examples: ['72790', '59907', '68820', '03929', '33916']
      },
      IO:
      {
        regex: 'BBND 1ZZ',
        examples: ['BBND 1ZZ', 'BBND 1ZZ', 'BBND 1ZZ', 'BBND 1ZZ', 'BBND 1ZZ']
      },
      BN:
      {
        regex: '[A-Z]{2}[ ]?\\d{4}',
        examples: ['BT9060', 'NS 5254', 'DL 8883', 'MR 6088', 'SJ 9173']
      },
      BG:
      {
        regex: '\\d{4}',
        examples: ['5772', '8251', '4272', '7203', '8119']
      },
      KH:
      {
        regex: '\\d{5}',
        examples: ['59793', '85850', '35876', '82307', '20156']
      },
      CV:
      {
        regex: '\\d{4}',
        examples: ['1521', '0266', '1294', '7178', '9406']
      },
      CL:
      {
        regex: '\\d{7}',
        examples: ['3092545', '8360398', '7037111', '4346760', '5939901']
      },
      CR:
      {
        regex: '\\d{4,5}|\\d{3}-\\d{4}',
        examples: ['7021', '4440', '5745', '99187', '26705']
      },
      HR:
      {
        regex: '\\d{5}',
        examples: ['04629', '60875', '00469', '77062', '51017']
      },
      CY:
      {
        regex: '\\d{4}',
        examples: ['7629', '1755', '6168', '2425', '0402']
      },
      CZ:
      {
        regex: '\\d{3}[ ]?\\d{2}',
        examples: ['26268', '70159', '41664', '245 32', '147 61']
      },
      DO:
      {
        regex: '\\d{5}',
        examples: ['87364', '79425', '70490', '92979', '73296']
      },
      EC:
      {
        regex: '([A-Z]\\d{4}[A-Z]|(?:[A-Z]{2})?\\d{6})?',
        examples: ['', '', 'W6014G', 'C7088H', '159116']
      },
      EG:
      {
        regex: '\\d{5}',
        examples: ['18099', '21348', '38067', '87640', '85065']
      },
      EE:
      {
        regex: '\\d{5}',
        examples: ['51515', '50315', '04091', '19035', '72295']
      },
      FO:
      {
        regex: '\\d{3}',
        examples: ['181', '062', '080', '756', '973']
      },
      GE:
      {
        regex: '\\d{4}',
        examples: ['0581', '5179', '4352', '1519', '0623']
      },
      GR:
      {
        regex: '\\d{3}[ ]?\\d{2}',
        examples: ['97743', '43693', '118 69', '02323', '59188']
      },
      GL:
      {
        regex: '39\\d{2}',
        examples: ['3955', '3920', '3972', '3917', '3919']
      },
      GT:
      {
        regex: '\\d{5}',
        examples: ['08683', '42752', '92492', '61201', '21017']
      },
      HT:
      {
        regex: '\\d{4}',
        examples: ['2830', '7612', '7315', '0656', '3720']
      },
      HN:
      {
        regex: '(?:\\d{5})?',
        examples: ['', '67483', '', '37525', '']
      },
      HU:
      {
        regex: '\\d{4}',
        examples: ['9966', '3081', '8939', '7890', '3119']
      },
      IS:
      {
        regex: '\\d{3}',
        examples: ['315', '389', '825', '952', '438']
      },
      IN:
      {
        regex: '\\d{6}',
        examples: ['349654', '077061', '705142', '453695', '460131']
      },
      ID:
      {
        regex: '\\d{5}',
        examples: ['79355', '84363', '80555', '90679', '46043']
      },
      IL:
      {
        regex: '\\d{5}',
        examples: ['92129', '55894', '81426', '77220', '32211']
      },
      JO:
      {
        regex: '\\d{5}',
        examples: ['57120', '14261', '27478', '39919', '50232']
      },
      KZ:
      {
        regex: '\\d{6}',
        examples: ['982327', '572930', '661600', '737818', '169168']
      },
      KE:
      {
        regex: '\\d{5}',
        examples: ['97878', '12747', '86219', '70252', '24303']
      },
      KW:
      {
        regex: '\\d{5}',
        examples: ['37656', '24129', '56561', '14975', '93730']
      },
      LA:
      {
        regex: '\\d{5}',
        examples: ['45463', '16020', '50289', '16961', '43915']
      },
      LV:
      {
        regex: '\\d{4}',
        examples: ['7239', '9167', '0090', '2610', '2317']
      },
      LB:
      {
        regex: '(\\d{4}([ ]?\\d{4})?)?',
        examples: ['', '', '', '', '9814']
      },
      LI:
      {
        regex: '(948[5-9])|(949[0-7])',
        examples: ['9496', '9487', '9494', '9490', '9494']
      },
      LT:
      {
        regex: '\\d{5}',
        examples: ['09782', '94550', '57248', '98914', '50698']
      },
      LU:
      {
        regex: '\\d{4}',
        examples: ['5165', '4604', '3232', '8962', '7460']
      },
      MK:
      {
        regex: '\\d{4}',
        examples: ['5477', '0476', '1560', '2631', '3091']
      },
      MY:
      {
        regex: '\\d{5}',
        examples: ['31105', '18781', '66846', '41696', '49544']
      },
      MV:
      {
        regex: '\\d{5}',
        examples: ['12467', '08111', '71472', '21518', '58566']
      },
      MT:
      {
        regex: '[A-Z]{3}[ ]?\\d{2,4}',
        examples: ['BOV 173', 'BUL 635', 'NNS720', 'QRH 670', 'VYS80']
      },
      MU:
      {
        regex: '(\\d{3}[A-Z]{2}\\d{3})?',
        examples: ['982TF837', '176RB114', '', '360LA248', '956MY482']
      },
      MX:
      {
        regex: '\\d{5}',
        examples: ['43432', '98800', '42720', '68987', '31173']
      },
      MD:
      {
        regex: '\\d{4}',
        examples: ['9563', '7737', '1404', '2737', '7828']
      },
      MC:
      {
        regex: '980\\d{2}',
        examples: ['98009', '98059', '98088', '98048', '98016']
      },
      MA:
      {
        regex: '\\d{5}',
        examples: ['68923', '22847', '76721', '47562', '50771']
      },
      NP:
      {
        regex: '\\d{5}',
        examples: ['16813', '17212', '93316', '66416', '86457']
      },
      NZ:
      {
        regex: '\\d{4}',
        examples: ['6264', '5568', '8675', '7217', '9698']
      },
      NI:
      {
        regex: '((\\d{4}-)?\\d{3}-\\d{3}(-\\d{1})?)?',
        examples: ['5963-809-357', '', '057-711', '4021-198-082-4', '717-502-8']
      },
      NG:
      {
        regex: '(\\d{6})?',
        examples: ['567945', '', '899887', '181425', '165665']
      },
      OM:
      {
        regex: '(PC )?\\d{3}',
        examples: ['780', '054', 'PC 197', 'PC 132', '291']
      },
      PK:
      {
        regex: '\\d{5}',
        examples: ['83317', '81646', '52967', '17696', '44663']
      },
      PY:
      {
        regex: '\\d{4}',
        examples: ['7820', '1846', '3659', '9980', '5979']
      },
      PH:
      {
        regex: '\\d{4}',
        examples: ['7415', '7250', '7640', '1582', '5167']
      },
      PL:
      {
        regex: '\\d{2}-\\d{3}',
        examples: ['31-089', '19-521', '69-242', '96-684', '24-212']
      },
      PR:
      {
        regex: '00[679]\\d{2}([ \\-]\\d{4})?',
        examples: ['00715', '00903', '00752', '00666', '00907']
      },
      RO:
      {
        regex: '\\d{6}',
        examples: ['440539', '964685', '221920', '600020', '168779']
      },
      RU:
      {
        regex: '\\d{6}',
        examples: ['806483', '049394', '549975', '364982', '022175']
      },
      SM:
      {
        regex: '4789\\d',
        examples: ['47899', '47895', '47896', '47895', '47898']
      },
      SA:
      {
        regex: '\\d{5}',
        examples: ['15803', '23300', '14732', '10660', '77742']
      },
      SN:
      {
        regex: '\\d{5}',
        examples: ['79667', '92908', '83852', '49092', '19301']
      },
      SK:
      {
        regex: '\\d{3}[ ]?\\d{2}',
        examples: ['958 62', '79188', '96636', '23358', '22645']
      },
      SI:
      {
        regex: '\\d{4}',
        examples: ['4222', '0674', '4407', '3230', '7662']
      },
      ZA:
      {
        regex: '\\d{4}',
        examples: ['6968', '9681', '9906', '1507', '1707']
      },
      LK:
      {
        regex: '\\d{5}',
        examples: ['09602', '22610', '75399', '52391', '61459']
      },
      TJ:
      {
        regex: '\\d{6}',
        examples: ['837113', '312229', '069089', '233216', '561206']
      },
      TH:
      {
        regex: '\\d{5}',
        examples: ['37679', '36539', '53794', '74785', '41615']
      },
      TN:
      {
        regex: '\\d{4}',
        examples: ['3606', '3370', '6393', '1618', '9875']
      },
      TR:
      {
        regex: '\\d{5}',
        examples: ['26479', '92350', '08469', '07889', '55569']
      },
      TM:
      {
        regex: '\\d{6}',
        examples: ['192778', '224289', '232411', '111497', '493066']
      },
      UA:
      {
        regex: '\\d{5}',
        examples: ['81133', '15300', '87881', '22809', '84394']
      },
      UY:
      {
        regex: '\\d{5}',
        examples: ['66873', '93188', '97965', '60628', '94453']
      },
      UZ:
      {
        regex: '\\d{6}',
        examples: ['107745', '260029', '279806', '982324', '548168']
      },
      VA:
      {
        regex: '00120',
        examples: ['00120', '00120', '00120', '00120', '00120']
      },
      VE:
      {
        regex: '\\d{4}',
        examples: ['1612', '6235', '8592', '8484', '0652']
      },
      ZM:
      {
        regex: '\\d{5}',
        examples: ['72168', '49152', '06453', '23698', '04946']
      },
      AS:
      {
        regex: '96799',
        examples: ['96799', '96799', '96799', '96799', '96799']
      },
      CC:
      {
        regex: '6799',
        examples: ['6799', '6799', '6799', '6799', '6799']
      },
      CK:
      {
        regex: '\\d{4}',
        examples: ['0816', '9355', '7895', '6222', '1376']
      },
      RS:
      {
        regex: '\\d{6}',
        examples: ['263484', '006592', '061988', '046453', '202249']
      },
      ME:
      {
        regex: '8\\d{4}',
        examples: ['84516', '87128', '82456', '84282', '84004']
      },
      CS:
      {
        regex: '\\d{5}',
        examples: ['67537', '51243', '71523', '26836', '22455']
      },
      YU:
      {
        regex: '\\d{5}',
        examples: ['84525', '20067', '59082', '04388', '87290']
      },
      CX:
      {
        regex: '6798',
        examples: ['6798', '6798', '6798', '6798', '6798']
      },
      ET:
      {
        regex: '\\d{4}',
        examples: ['2084', '0445', '3595', '7624', '1198']
      },
      FK:
      {
        regex: 'FIQQ 1ZZ',
        examples: ['FIQQ 1ZZ', 'FIQQ 1ZZ', 'FIQQ 1ZZ', 'FIQQ 1ZZ', 'FIQQ 1ZZ']
      },
      NF:
      {
        regex: '2899',
        examples: ['2899', '2899', '2899', '2899', '2899']
      },
      FM:
      {
        regex: '(9694[1-4])([ \\-]\\d{4})?',
        examples: ['96944', '96944', '96944', '96944', '96941']
      },
      GF:
      {
        regex: '9[78]3\\d{2}',
        examples: ['98343', '98316', '97387', '97345', '97358']
      },
      GN:
      {
        regex: '\\d{3}',
        examples: ['199', '009', '563', '457', '905']
      },
      GP:
      {
        regex: '9[78][01]\\d{2}',
        examples: ['98161', '98185', '98148', '97073', '97152']
      },
      GS:
      {
        regex: 'SIQQ 1ZZ',
        examples: ['SIQQ 1ZZ', 'SIQQ 1ZZ', 'SIQQ 1ZZ', 'SIQQ 1ZZ', 'SIQQ 1ZZ']
      },
      GU:
      {
        regex: '969[123]\\d([ \\-]\\d{4})?',
        examples: ['96927-9038', '96920 3616', '96930', '96913', '96930']
      },
      GW:
      {
        regex: '\\d{4}',
        examples: ['8029', '9784', '2894', '5279', '0971']
      },
      HM:
      {
        regex: '\\d{4}',
        examples: ['2609', '9587', '7208', '3254', '6423']
      },
      IQ:
      {
        regex: '\\d{5}',
        examples: ['55672', '34942', '23090', '65697', '56520']
      },
      KG:
      {
        regex: '\\d{6}',
        examples: ['237029', '243235', '160508', '449272', '703836']
      },
      LR:
      {
        regex: '\\d{4}',
        examples: ['7212', '9444', '4622', '5419', '7938']
      },
      LS:
      {
        regex: '\\d{3}',
        examples: ['450', '713', '012', '238', '446']
      },
      MG:
      {
        regex: '\\d{3}',
        examples: ['581', '465', '758', '827', '402']
      },
      MH:
      {
        regex: '969[67]\\d([ \\-]\\d{4})?',
        examples: ['96970 7096', '96979', '96964 7906', '96973-2236', '96976-9588']
      },
      MN:
      {
        regex: '\\d{6}',
        examples: ['382762', '581681', '090484', '380198', '872434']
      },
      MP:
      {
        regex: '9695[012]([ \\-]\\d{4})?',
        examples: ['96952 7589', '96952 1716', '96950', '96951', '96951']
      },
      MQ:
      {
        regex: '9[78]2\\d{2}',
        examples: ['98283', '97266', '98252', '97268', '97260']
      },
      NC:
      {
        regex: '988\\d{2}',
        examples: ['98844', '98873', '98854', '98804', '98832']
      },
      NE:
      {
        regex: '\\d{4}',
        examples: ['7200', '4570', '3701', '1139', '1146']
      },
      VI:
      {
        regex: '008(([0-4]\\d)|(5[01]))([ \\-]\\d{4})?',
        examples: ['00817 1620', '00851', '00851 3369', '00827', '00842-4984']
      },
      PF:
      {
        regex: '987\\d{2}',
        examples: ['98737', '98778', '98772', '98726', '98785']
      },
      PG:
      {
        regex: '\\d{3}',
        examples: ['187', '709', '101', '475', '179']
      },
      PM:
      {
        regex: '9[78]5\\d{2}',
        examples: ['98597', '98541', '98580', '98590', '98538']
      },
      PN:
      {
        regex: 'PCRN 1ZZ',
        examples: ['PCRN 1ZZ', 'PCRN 1ZZ', 'PCRN 1ZZ', 'PCRN 1ZZ', 'PCRN 1ZZ']
      },
      PW:
      {
        regex: '96940',
        examples: ['96940', '96940', '96940', '96940', '96940']
      },
      RE:
      {
        regex: '9[78]4\\d{2}',
        examples: ['97444', '97406', '97457', '98499', '98407']
      },
      SH:
      {
        regex: '(ASCN|STHL) 1ZZ',
        examples: ['ASCN 1ZZ', 'ASCN 1ZZ', 'STHL 1ZZ', 'ASCN 1ZZ', 'STHL 1ZZ']
      },
      SJ:
      {
        regex: '\\d{4}',
        examples: ['4592', '5393', '5700', '4451', '4798']
      },
      SO:
      {
        regex: '\\d{5}',
        examples: ['77435', '79623', '74608', '91224', '86030']
      },
      SZ:
      {
        regex: '[HLMS]\\d{3}',
        examples: ['H204', 'M449', 'S508', 'L905', 'H948']
      },
      TC:
      {
        regex: 'TKCA 1ZZ',
        examples: ['TKCA 1ZZ', 'TKCA 1ZZ', 'TKCA 1ZZ', 'TKCA 1ZZ', 'TKCA 1ZZ']
      },
      WF:
      {
        regex: '986\\d{2}',
        examples: ['98654', '98638', '98642', '98631', '98619']
      },
      XK:
      {
        regex: '\\d{5}',
        examples: ['79846', '50341', '40758', '33676', '18490']
      },
      YT:
      {
        regex: '976\\d{2}',
        examples: ['97660', '97677', '97631', '97628', '97610']
      }
    };
  }

}
