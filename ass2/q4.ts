import { map } from "ramda";
import { Parsed, AppExp, isProgram, isBoolExp, isNumExp, isVarRef, isPrimOp, isLitExp, isProcExp, isIfExp, isAppExp, isDefineExp, isLetExp, PrimOp, CExp, isStrExp } from './imp/L3-ast';
import {parsedToString} from './imp/L3-value';
import {isError} from './imp/error';

/*
;; Signature: l2ToPython(exp)
;; Purpose: convert en expression in L2 to the matching expression in Python
;; Type: [Parsed | Error -> string | Error]
;; Exmple: (l2ToPython (define x 5)) => x = 5
;;         (l2ToPython (define b (> 3 4))) => b = (3 > 4)
;; Precondition: true
;; Tests: (l2ToPython (define x 5)) => x = 5
;;        (l2ToPython (define b (> 3 4))) => b = (3 > 4)
*/
export const l2ToPython = (exp: Parsed | Error): string | Error => 
   isError(exp) ? exp.message :
   isProgram(exp) ? map(l2ToPython,exp.exps).join("\n") :
   isBoolExp(exp) ? (exp.val ? "True" : "False") :
   isNumExp(exp) ? exp.val :
   isStrExp(exp) ? exp.val :
   isVarRef(exp) ? exp.var :
   isPrimOp(exp) ? exp.op :
   isDefineExp(exp) ? exp.var.var + " = " + l2ToPython(exp.val) :
   isProcExp(exp) ? "(lambda " + map((p) => p.var, exp.args).join(", ") + ": " + map(l2ToPython,exp.body).join(" ") + ")" :
   isIfExp(exp) ? "(" + l2ToPython(exp.then) + " if " + l2ToPython(exp.test) + " else " + l2ToPython(exp.alt) + ")":
   isAppExp(exp) ? 
      isPrimOp(exp.rator) ? exp.rator.op == "not" ? "(" + l2ToPython(exp.rator) + " " + map(l2ToPython, exp.rands) + ")":
       "(" + map((p)=>l2ToPython(p),exp.rands).join(" "+l2ToPython(exp.rator)+" ") +  ")":
      isVarRef(exp.rator) ? l2ToPython(exp.rator)+"("+ map(l2ToPython, exp.rands).join(",") +")" :
      isProcExp(exp.rator)? l2ToPython(exp.rator)+"("+ map(l2ToPython, exp.rands).join(",") +")"  :
      "(" + map(l2ToPython, exp.rands).join(" "+ l2ToPython(exp.rator)+" ") +")" :        
   Error("Unknown expression: " + exp.tag);    
