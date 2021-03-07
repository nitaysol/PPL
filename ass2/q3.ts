import { map, zipWith } from "ramda";
import { CExp, Parsed, PrimOp, AppExp, LitExp, isExp,Exp, LetExp } from "./imp/L3-ast";
import { makeAppExp, makeDefineExp, makeIfExp, makeProcExp, makeProgram, makePrimOp, makeLetExp, makeBinding, makeLitExp } from "./imp/L3-ast";
import { isAppExp, isAtomicExp, isCExp, isDefineExp, isIfExp, isLetExp, isLitExp, isPrimOp, isProcExp, isProgram, isStrExp } from "./imp/L3-ast";
import {isError} from './imp/error';
import { makeEmptySExp, isEmptySExp, isCompoundSExp, compoundSExpToArray, isSymbolSExp } from "./imp/L3-value";
import {first, second, rest} from './imp/list';

/*
;; Signature: l3ToL30(exp)
;; Purpose: convert a L3 AST to the matching L30 Ast
;; Type: [Parsed | Error -> Parsed | Error]
;; Exmple: (l3ToL30 (list (cons (* 5  6) '(1 2 3)))) => (cons (cons (* 5 6) (cons 1 (cons 2 (cons 3 '())))) '())
;;         (l3ToL30 (if (> x y) (list 1 2) '(3 4))) => b = (if (> x y) (cons 1 (cons 2 '())) (cons 3 (cons 4 '())))
;; Precondition: true
;; Tests: (l3ToL30 (list (cons (* 5  6) '(1 2 3)))) => (cons (cons (* 5 6) (cons 1 (cons 2 (cons 3 '())))) '())
;;        (l3ToL30 (if (> x y) (list 1 2) '(3 4))) => b = (if (> x y) (cons 1 (cons 2 '())) (cons 3 (cons 4 '())))
*/
export const l3ToL30 = (exp: Parsed | Error): Parsed | Error  =>
   isError(exp) ? exp :
   isExp(exp) ? rewriteAllListExp(exp) :
   isProgram(exp) ? makeProgram(map(rewriteAllListExp, exp.exps)) :
   exp;


/*
;; Signature: rewriteAllListExp(exp)
;; Purpose: convert an Expression in L3 to an expression in L30
;; Type: [Exp -> Exp]
;; Exmple: (rewriteAllListExp((list 1 2))) => (cons 1 (cons 2 '()))
;; Precondition: true
;; Tests: (rewriteAllListExp((list 1 2))) => (cons 1 (cons 2 '()))
*/
export const rewriteAllListExp = (exp: Exp): Exp =>
   isCExp(exp) ? rewriteAllListCExp(exp) :
   isDefineExp(exp) ? makeDefineExp(exp.var, rewriteAllListCExp(exp.val)) :
   exp;


/*
;; Signature: rewriteAllListCExp(exp)
;; Purpose: convert a CExpression in L3 to CExpression in L30
;; Type: [CExp -> CExp]
;; Exmple: (rewriteAllListCExp (lambda (x) (list x 3))) => (lambda (x) (cons x (cons 3 '())))
;; Precondition: true
;; Tests: (rewriteAllListCExp (lambda (x) (list x 3))) => (lambda (x) (cons x (cons 3 '())))
*/
export const rewriteAllListCExp = (exp: CExp): CExp =>
   isAtomicExp(exp) ? exp :
   isLitExp(exp) ? configureLitexp(exp):
   isIfExp(exp) ? makeIfExp(rewriteAllListCExp(exp.test), rewriteAllListCExp(exp.then), rewriteAllListCExp(exp.alt)) :
   isAppExp(exp) ? 
      isPrimOp(exp.rator) ? 
         (exp.rator.op === "list") ? 
            rewriteList(exp) :
            makeAppExp(rewriteAllListCExp(exp.rator), map(rewriteAllListCExp, exp.rands)) :
         makeAppExp(rewriteAllListCExp(exp.rator), map(rewriteAllListCExp, exp.rands)) :
   isProcExp(exp) ? makeProcExp(map(rewriteAllListCExp ,exp.args), map(rewriteAllListCExp, exp.body)) :
   isLetExp(exp) ? configureLetexp(exp):
   exp;

/*
;; Signature: rewriteList(e)
;; Purpose: convert an application expression in L3 to application expression in L30 (cons instead of list)
;; Type: [AppExp -> AppExp]
;; Exmple: (rewriteList (list (list 1 2) (list 3 4))) => (cons (cons 1 (cons 2 '())) (cons (cons 3 (cons 4 '())) '()))
;; Precondition: true
;; Tests: (rewriteList (list (list 1 2) (list 3 4))) => (cons (cons 1 (cons 2 '())) (cons (cons 3 (cons 4 '())) '()))
*/
export const rewriteList = (e: AppExp): AppExp => {
   return (e.rands.length===0) ? makeAppExp(makePrimOp("cons"),[]) :
   (e.rands.length===1) ? makeAppExp(makePrimOp("cons"), [rewriteAllListCExp(first(e.rands)),makeLitExp(makeEmptySExp())]) :
   makeAppExp(makePrimOp("cons"),[rewriteAllListCExp(first(e.rands)), buildNewList(rest(e.rands))]);   
}

/*
;; Signature: buildNewList(array)
;; Purpose: convert an array of C-expressions in to an application expression
;; Type: [CExp[] -> AppExp]
;; Exmple: (buildNewList ([list, (list 1 2), (list 3 4)])) => (cons (cons 1 (cons 2 '())) (cons (cons 3 (cons 4 '())) '()))
;; Precondition: true
;; Tests: (rewriteList ([list, (list 1 2), (list 3 4)])) => (cons (cons 1 (cons 2 '())) (cons (cons 3 (cons 4 '())) '()))
*/
export const buildNewList = (array: CExp[]): AppExp => {
   return (array.length===1) ? makeAppExp(makePrimOp("cons"), [rewriteAllListCExp(first(array)),makeLitExp(makeEmptySExp())]) :
   makeAppExp(makePrimOp("cons"),[rewriteAllListCExp(first(array)), buildNewList(rest(array))]);
}

/*
;; Signature: configureLitexp(e)
;; Purpose: convert a literal expression in L3 to literal expression in L30
;; Type: [LitExp -> AppExp|LitExp]
;; Exmple: (configureLitexp ('(1 2 3))) => (cons 1 (cons 2 (cons 3 '())))
;; Precondition: true
;; Tests: (configureLitexp ('(1 2 3))) => (cons 1 (cons 2 (cons 3 '())))
*/
export const configureLitexp = (exp: LitExp): AppExp|LitExp => {
   return isCompoundSExp(exp.val) ? makeAppExp(makePrimOp("cons"),[makeLitExp(exp.val.val1),configureLitexp(makeLitExp(exp.val.val2))]) :
   isSymbolSExp(exp.val) ? makeAppExp(makePrimOp("cons"),[makeLitExp(exp.val.val),makeLitExp(makeEmptySExp())]) :
   exp;
}

/*
;; Signature: configureLetexp(e)
;; Purpose: convert a let expression in L3 to let expression in L30
;; Type: [LetExp -> LetExp]
;; Exmple: (configureLetexp (let ((x '(1 2)) (y (list 3 4))) (list x y))) => (let ((x (cons 1 (cons 2 '()))) (y (cons 3 (cons 4 '())))) (cons x (cons y '())))
;; Precondition: true
;; Tests: (configureLetexp (let ((x '(1 2)) (y (list 3 4))) (list x y))) => (let ((x (cons 1 (cons 2 '()))) (y (cons 3 (cons 4 '())))) (cons x (cons y '())))
*/
export const configureLetexp = (exp: LetExp): LetExp => {
   const bindings = map((b)=> makeBinding(b.var.var, rewriteAllListCExp(b.val)), exp.bindings);
   return makeLetExp(bindings, map(l3ToL30, exp.body));
}