import jp from 'json-pointer';
import {cloneDeep} from 'lodash';
import ZSchema from 'z-schema';

import UniqueOperationIDChecker from './UniqueOperationIDChecker';
import ReferencesChecker from './ReferencesChecker';

import schema from '../schemas/schema.json';

export var ALL_CHECKERS = [
  UniqueOperationIDChecker,
  ReferencesChecker
];

function registerValidators(schema, validators) {
  for (let validator of validators) {
    let subSchema = jp.get(schema, validator.pointer);
    subSchema.$validators || (subSchema.$validators = []);
    subSchema.$validators.push(validator.func);
  }
}

export function runCheckers(api, checkers = ALL_CHECKERS) {
  let schemaOrig = cloneDeep(schema);
  var schemaDeref = cloneDeep(schema);
  let results = [];

  function customValidator(report, schema, json) {
    if (Array.isArray(schema.$validators)) {
      schema.$validators.forEach((validator) => {
        let issue = validator(json, report.getPath(true), api);
        if (issue) results.push(issue);
      });
    }
  }

  for (let CheckerType of checkers) {
    let checker = new CheckerType();
    registerValidators(schemaOrig, checker.pointers);
    registerValidators(schemaDeref, checker.pointersDeref);
  }

  var validator = new ZSchema({ customValidator: customValidator });

  validator.validate(api.spec, schemaOrig);
  validator.validate(api.specDeref, schemaDeref);
  return results;
}

export function getIssuesInfo(checkers = ALL_CHECKERS) {
  let res = {};
  for (let CheckerType of checkers) {
    let info = CheckerType.getInfo();
    for (let code of Object.keys(info)) {
      if (code in res) throw new Error('Different checkers can\'t throw the same issue: ' + code);
      res[code] = info[code];
    }
  }
  return res;
}
