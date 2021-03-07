// L5-typecheck
// ========================================================
import deepEqual = require("deep-equal");
import { map, zip, zipWith } from 'ramda';
import { isAppExp, isBoolExp, isDefineExp, isEmpty, isIfExp, isLetrecExp, isLetExp, isNumExp,
         isPrimOp, isProcExp, isProgram, isStrExp, isVarRef, parse, unparse,
         AppExp, BoolExp, DefineExp, Exp, IfExp, LetrecExp, LetExp, LitExp, NumExp,
         Parsed, PrimOp, ProcExp, Program, SetExp, StrExp } from "./L5-ast";
import { applyTEnv, makeEmptyTEnv, makeExtendTEnv, TEnv } from "./TEnv";
// import { isEmpty, isLetrecExp, isLitExp, isStrExp, BoolExp } from "./L5-ast";
import { isProcTExp, makeBoolTExp, makeNumTExp, makeProcTExp, makeStrTExp, makeVoidTExp,
         parseTE, unparseTExp,
         BoolTExp, NumTExp, ProcTExp, StrTExp, TExp, isAtomicTExp, AtomicTExp, isUnionTExp, UnionTExp, makeUnionTExp, flatUnionTExp, isTVar } from "./TExp";
import { getErrorMessages, hasNoError, isError } from './error';
import { allT, first, rest, second } from './list';

// Purpose: Check that type expressions are equivalent
// as part of a fully-annotated type check process of exp.
// Return an error if the types are different - true otherwise.
// Exp is only passed for documentation purposes.
const checkEqualType = (te1: TExp | Error, te2: TExp | Error, exp: Exp): true | Error =>
  isError(te1) ? te1 :
  isError(te2) ? te2 :
  deepEqual(te1, te2) ||
  Error(`Incompatible types: ${unparseTExp(te1)} and ${unparseTExp(te2)} in ${unparse(exp)}`);

// Compute the type of L5 AST exps to TE
// ===============================================
// Compute a Typed-L5 AST exp to a Texp on the basis
// of its structure and the annotations it contains.

// Purpose: Compute the type of a concrete fully-typed expression
export const L5typeof = (concreteExp: string): string | Error =>
    unparseTExp(typeofExp(parse(concreteExp), makeEmptyTEnv()));

// Purpose: Compute the type of an expression
// Traverse the AST and check the type according to the exp type.
// We assume that all variables and procedures have been explicitly typed in the program.
export const typeofExp = (exp: Parsed | Error, tenv: TEnv): TExp | Error =>
    isNumExp(exp) ? typeofNum(exp) :
    isBoolExp(exp) ? typeofBool(exp) :
    isStrExp(exp) ? typeofStr(exp) :
    isPrimOp(exp) ? typeofPrim(exp) :
    isVarRef(exp) ? applyTEnv(tenv, exp.var) :
    isIfExp(exp) ? typeofIf(exp, tenv) :
    isProcExp(exp) ? typeofProc(exp, tenv) :
    isAppExp(exp) ? typeofApp(exp, tenv) :
    isLetExp(exp) ? typeofLet(exp, tenv) :
    isLetrecExp(exp) ? typeofLetrec(exp, tenv) :
    isDefineExp(exp) ? typeofDefine(exp, tenv) :
    isProgram(exp) ? typeofProgram(exp, tenv) :
    // Skip isSetExp(exp) isLitExp(exp)
    Error("Unknown type");

// Purpose: Compute the type of a sequence of expressions
// Check all the exps in a sequence - return type of last.
// Pre-conditions: exps is not empty.
export const typeofExps = (exps: Exp[], tenv: TEnv): TExp | Error =>
    isEmpty(rest(exps)) ? typeofExp(first(exps), tenv) :
    isError(typeofExp(first(exps), tenv)) ? typeofExp(first(exps), tenv) :
    typeofExps(rest(exps), tenv);

// a number literal has type num-te
export const typeofNum = (n: NumExp): NumTExp => makeNumTExp();

// a boolean literal has type bool-te
export const typeofBool = (b: BoolExp): BoolTExp => makeBoolTExp();

// a string literal has type str-te
const typeofStr = (s: StrExp): StrTExp => makeStrTExp();

// primitive ops have known proc-te types
const numOpTExp = parseTE('(number * number -> number)');
const numCompTExp = parseTE('(number * number -> boolean)');
const boolOpTExp = parseTE('(boolean * boolean -> boolean)');
const typePredTExp = parseTE('(T -> boolean)');

// cons, car, cdr are not covered in this version
export const typeofPrim = (p: PrimOp): TExp | Error =>
    ['+', '-', '*', '/'].includes(p.op) ? numOpTExp :
    ['and', 'or'].includes(p.op) ? boolOpTExp :
    ['>', '<', '='].includes(p.op) ? numCompTExp :
    ['number?', 'boolean?', 'string?', 'symbol?', 'list?'].includes(p.op) ? typePredTExp :
    (p.op === 'not') ? parseTE('(boolean -> boolean)') :
    (p.op === 'eq?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'string=?') ? parseTE('(T1 * T2 -> boolean)') :
    (p.op === 'display') ? parseTE('(T -> void)') :
    (p.op === 'newline') ? parseTE('(Empty -> void)') :
    Error(`Unknown primitive ${p.op}`);


// Purpose: compute the type of an if-exp
// Typing rule:
//   if type<test>(tenv) = boolean
//      type<then>(tenv) = t1
//      type<else>(tenv) = t2
// then type<(if test then else)>(tenv) = t1 | t2
export const typeofIf = (ifExp: IfExp, tenv: TEnv): TExp | Error => {
    const testTE = typeofExp(ifExp.test, tenv);
    const thenTE = typeofExp(ifExp.then, tenv);
    const altTE = typeofExp(ifExp.alt, tenv);
    const constraint1 = checkEqualTypeWithFalse(testTE, makeBoolTExp(), ifExp);
    const constraint2 = checkEqualTypeWithFalse(thenTE, altTE, ifExp);
    if (isError(constraint1))
        return constraint1;
    if (isError(constraint2)){
        if(!isError(thenTE) && !isError(altTE))
            return makeUnionTExp([thenTE,altTE]);
        else Error("Error in then or alt");
    }
    else
        return thenTE;
};



// Purpose: compute the type of a proc-exp
// Typing rule:
// If   type<body>(extend-tenv(x1=t1,...,xn=tn; tenv)) = t
// then type<lambda (x1:t1,...,xn:tn) : t exp)>(tenv) = (t1 * ... * tn -> t)
export const typeofProc = (proc: ProcExp, tenv: TEnv): TExp | Error => {
    const argsTEs = map((vd) => vd.texp, proc.args);
    const extTEnv = makeExtendTEnv(map((vd) => vd.var, proc.args), argsTEs, tenv);
    const constraint1 = checkEqualTypeWithFalse(typeofExps(proc.body, extTEnv), proc.returnTE, proc);
    if (isError(constraint1))
        return constraint1;
    else
        return makeProcTExp(argsTEs, proc.returnTE);
};

// Purpose: compute the type of an app-exp
// Typing rule:
// If   type<rator>(tenv) = (t1*..*tn -> t)
//      type<rand1>(tenv) = t1
//      ...
//      type<randn>(tenv) = tn
// then type<(rator rand1...randn)>(tenv) = t
// We also check the correct number of arguments is passed.
export const typeofApp = (app: AppExp, tenv: TEnv): TExp | Error => {
    const ratorTE = typeofExp(app.rator, tenv);
    if (! isProcTExp(ratorTE))
        return Error(`Application of non-procedure: ${unparseTExp(ratorTE)} in ${unparse(app)}`);
    if (app.rands.length !== ratorTE.paramTEs.length)
        return Error(`Wrong parameter numbers passed to proc: ${unparse(app)}`);
    const constraints = zipWith((rand, trand) => checkEqualTypeWithFalse(typeofExp(rand, tenv), trand, app),
                                app.rands, ratorTE.paramTEs);
    if (hasNoError(constraints))
        return ratorTE.returnTE;
    else
        return Error(getErrorMessages(constraints));
};

// Purpose: compute the type of a let-exp
// Typing rule:
// If   type<val1>(tenv) = t1
//      ...
//      type<valn>(tenv) = tn
//      type<body>(extend-tenv(var1=t1,..,varn=tn; tenv)) = t
// then type<let ((var1 val1) .. (varn valn)) body>(tenv) = t
export const typeofLet = (exp: LetExp, tenv: TEnv): TExp | Error => {
    const vars = map((b) => b.var.var, exp.bindings);
    const vals = map((b) => b.val, exp.bindings);
    const varTEs = map((b) => b.var.texp, exp.bindings);
    const constraints = zipWith((varTE, val) => checkEqualTypeWithFalse(varTE, typeofExp(val, tenv), exp),
                                varTEs, vals);
    if (hasNoError(constraints))
        return typeofExps(exp.body, makeExtendTEnv(vars, varTEs, tenv));
    else
        return Error(getErrorMessages(constraints));
};

// Purpose: compute the type of a letrec-exp
// We make the same assumption as in L4 that letrec only binds proc values.
// Typing rule:
//   (letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)
//   tenv-body = extend-tenv(p1=(t11*..*t1n1->t1)....; tenv)
//   tenvi = extend-tenv(xi1=ti1,..,xini=tini; tenv-body)
// If   type<body1>(tenv1) = t1
//      ...
//      type<bodyn>(tenvn) = tn
//      type<body>(tenv-body) = t
// then type<(letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)>(tenv-body) = t
export const typeofLetrec = (exp: LetrecExp, tenv: TEnv): TExp | Error => {
    const ps = map((b) => b.var.var, exp.bindings);
    const procs = map((b) => b.val, exp.bindings);
    if (! allT(isProcExp, procs))
        return Error(`letrec - only support binding of procedures - ${exp}`);
    const paramss = map((p) => p.args, procs);
    const bodies = map((p) => p.body, procs);
    const tijs = map((params) => map((p) => p.texp, params), paramss);
    const tis = map((proc) => proc.returnTE, procs);
    const tenvBody = makeExtendTEnv(ps, zipWith((tij, ti) => makeProcTExp(tij, ti), tijs, tis), tenv);
    const tenvIs = zipWith((params, tij) => makeExtendTEnv(map((p) => p.var, params), tij, tenvBody),
                           paramss, tijs);
    const types = zipWith((bodyI, tenvI) => typeofExps(bodyI, tenvI), bodies, tenvIs)
    const constraints : (true | Error)[] = zipWith((typeI, ti) => checkEqualTypeWithFalse(typeI, ti, exp), types, tis);
    if (hasNoError(constraints))
        return typeofExps(exp.body, tenvBody);
    else
        return Error(getErrorMessages(constraints));
};

// Typecheck a full program
// TODO: Thread the TEnv (as in L1)

// Purpose: compute the type of a define
// Typing rule:
//   (define (var : texp) val)
// TODO - write the true definition
export const typeofDefine = (exp: DefineExp, tenv: TEnv): TExp | Error => {
    // return Error("TODO");
    return makeVoidTExp();
};

// Purpose: compute the type of a program
// Typing rule:
// TODO - write the true definition
export const typeofProgram = (exp: Program, tenv: TEnv): TExp | Error => {
    return Error("TODO");
};

// TODO: 
export const checkCompatibleTypes = (te1: TExp, te2: TExp): boolean | Error =>{
    if (isError(te1))
        return te1;
    else if (isError(te2))
            return te2;
    return isAtomicTExp(te1) && (isAtomicTExp(te2)) ?  option1(te1, te2):
    isAtomicTExp(te1) && isUnionTExp(te2) ? option2(te1, te2):
    isAtomicTExp(te1) && isProcTExp(te2) ? false:
    isUnionTExp(te1) && isAtomicTExp(te2) ? false:
    isUnionTExp(te1) && isUnionTExp(te2) ? option5(te1, te2):
    isUnionTExp(te1) && isProcTExp(te2) ? false:
    isProcTExp(te1) && isAtomicTExp(te2) ? false:
    isProcTExp(te1) && isUnionTExp(te2) ? false:
    isProcTExp(te1) && isProcTExp(te2) ? option9(te1, te2):
    isTVar(te1) && isTVar(te2) ? deepEqual(te1, te2) :
    Error("error in type checking")
}

export const option1 = (te1: AtomicTExp, te2: AtomicTExp): boolean|Error =>{
    let result:boolean = te1.tag===te2.tag;
    return result;
}
    
export const option2 = (te1: AtomicTExp, te2: UnionTExp): boolean|Error =>{
    let result:boolean|Error = te2.types.reduce((acc,curr) =>{
        if (isError(curr))
            return curr;
        else return acc || curr.tag===te1.tag
    }, false);
    return result;
}

export const option5 = (te1: UnionTExp, te2: UnionTExp): boolean|Error =>{
    let result = te1.types.reduce((acc1:boolean,curr1:TExp) =>{
        if (isError(curr1))
            return curr1;
        else{
            return acc1 && te2.types.reduce((acc2:boolean, curr2:TExp) => {
                if (isError(curr2))
                    return curr2;
                else return acc2 || checkCompatibleTypes(curr1,curr2)
            }, false)
        } 
    }, true);
    return result;
}

export const option9 = (te1: ProcTExp, te2: ProcTExp): boolean|Error =>{
    let checkLength:boolean = te1.paramTEs.length == te2.paramTEs.length;
    let composed = zip(te1.paramTEs, te2.paramTEs);
    let checkParams = composed.reduce((acc:boolean, curr:[TExp,TExp]) =>{
        if(isError(curr[0]))
            return curr[0];
        else if(isError(curr[1]))
            return curr[1];
        else return acc && checkCompatibleTypes(curr[0],curr[1]);
    },true);
    if(isError(checkParams))
        return checkParams;
    let checkReturnedValue = checkCompatibleTypes(te1.returnTE, te2.returnTE);
    let result:boolean|Error = checkLength && checkParams && checkReturnedValue;
    return result;
}

export const checkEqualTypeWithFalse = (te1: TExp | Error, te2: TExp | Error, exp: Exp) : boolean | Error =>{
    if (isError(te1))
        return te1;
    else if (isError(te2))
            return te2;
    if(checkCompatibleTypes(te1,te2)) 
        return true;
    return Error("Types are not compatible") ;
}
