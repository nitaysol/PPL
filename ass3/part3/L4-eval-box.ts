// L4-eval-box.ts
// L4 with mutation (set!) and env-box model
// Direct evaluation of letrec with mutation, define supports mutual recursion.

import { map, reduce, filter, repeat, zipWith } from "ramda";
import { allT, first, rest, isBoolean, isEmpty, isNumber, isString } from "./list";
import { getErrorMessages, hasNoError, isError }  from "./error";
import { isBoolExp, isCExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef, isSetExp,
         isAppExp, isDefineExp, isExp, isIfExp, isLetrecExp, isLetExp, isProcExp, isProgram, 
         Binding, PrimOp, VarDecl, CExp, Exp, IfExp, LetrecExp, LetExp, Parsed, ProcExp, Program, SetExp,
         parse,unparse } from "./L4-ast";
import { applyEnv, applyEnvBdg, globalEnvAddBinding, makeExtEnv, setFBinding,
            theGlobalEnv, Env, persistentEnv, appliedEnvs, isGlobalEnv, isExtEnv, getFBindingVal, FBinding, getFBindingVar, ExtEnv } from "./L4-env-box";
import { isEmptySExp, isSymbolSExp, isClosure, isCompoundSExp, makeClosure, makeCompoundSExp, Closure, 
         CompoundSExp, EmptySExp, makeEmptySExp, Value, valueToString, SExp, closuredIdsMap } from "./L4-value-box";
import { Graph } from "graphlib";
import dot = require("graphlib-dot");

type Box<T> = T[];
const makeBox = <T>(x: T): Box<T> => ([x]);
const unbox = <T>(b: Box<T>): T => b[0];
const setBox = <T>(b: Box<T>, v: T): void => { b[0] = v; return; }
// ========================================================
// Eval functions

const applicativeEval = (exp: CExp | Error, env: Env): Value | Error =>
    isError(exp)  ? exp :
    isNumExp(exp) ? exp.val :
    isBoolExp(exp) ? exp.val :
    isStrExp(exp) ? exp.val :
    isPrimOp(exp) ? exp :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? exp.val :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isLetExp(exp) ? evalLet(exp, env) :
    isLetrecExp(exp) ? evalLetrec(exp, env) :
    isSetExp(exp) ? evalSet(exp, env) :
    isAppExp(exp) ? applyProcedure(applicativeEval(exp.rator, env),
                                   map((rand: CExp) => applicativeEval(rand, env),
                                        exp.rands),env) :
    Error(`Bad L4 AST ${exp}`);

export const isTrueValue = (x: Value | Error): boolean | Error =>
    isError(x) ? x :
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Value | Error => {
    const test = applicativeEval(exp.test, env);
    return isError(test) ? test :
        isTrueValue(test) ? applicativeEval(exp.then, env) :
        applicativeEval(exp.alt, env);
};

const evalProc = (exp: ProcExp, env: Env): Closure =>
    makeClosure(exp.args, exp.body, env);

// @Pre: none of the args is an Error (checked in applyProcedure)
// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const applyProcedure = (proc: Value | Error, args: Array<Value | Error>,env:Env): Value | Error =>
    isError(proc) ? proc :
    !hasNoError(args) ? Error(`Bad argument: ${getErrorMessages(args)}`) :
    isPrimOp(proc) ? applyPrimitive(proc, args) :
    isClosure(proc) ? applyClosure(proc, args,env) :
    Error(`Bad procedure ${JSON.stringify(proc)}`);

const applyClosure = (proc: Closure, args: Value[], env:Env): Value | Error => {
    let vars = map((v: VarDecl) => v.var, proc.params);
    let return_env = makeExtEnv(vars, args, proc.env);
    appliedEnvs[return_env.id] = isGlobalEnv(env)? "GE" : env.id;
    return evalExps(proc.body, return_env);
}

// Evaluate a sequence of expressions (in a program)
export const evalExps = (exps: Exp[], env: Env): Value | Error =>
    isEmpty(exps) ? Error("Empty program") :
    isDefineExp(first(exps)) ? evalDefineExps(first(exps), rest(exps)) :
    evalCExps(first(exps), rest(exps), env);
    
const evalCExps = (exp1: Exp, exps: Exp[], env: Env): Value | Error =>
    isCExp(exp1) && isEmpty(exps) ? applicativeEval(exp1, env) :
    isCExp(exp1) ? (isError(applicativeEval(exp1, env)) ? Error("error") :
                    evalExps(exps, env)) :
    Error("Never");

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
// L4-BOX @@
// define always updates theGlobalEnv
// We also only expect defineExps at the top level.
const evalDefineExps = (def: Exp, exps: Exp[]): Value | Error => {
    if (isDefineExp(def)) {
        let rhs = applicativeEval(def.val, theGlobalEnv);
        if (isError(rhs))
            return rhs;
        else {
            globalEnvAddBinding(def.var.var, rhs);
            return evalExps(exps, theGlobalEnv);
        }
    } else {
        return Error("unexpected " + def);
    }
}

// Main program
// L4-BOX @@ Use GE instead of empty-env
export const evalProgram = (program: Program): Value | Error =>
    evalExps(program.exps, theGlobalEnv);

export const evalParse = (s: string): Value | Error => {
    let ast: Parsed | Error = parse(s);
    if (isProgram(ast)) {
        return evalProgram(ast);
    } else if (isExp(ast)) {
        return evalExps([ast], theGlobalEnv);
    } else {
        return ast;
    }
}

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Value | Error => {
    const vals: SExp[]= map((v: CExp) => applicativeEval(v, env), map((b: Binding) => b.val, exp.bindings));
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    if (hasNoError(vals)) {
        let return_env = makeExtEnv(vars, vals, env);
        appliedEnvs[return_env.id] = isGlobalEnv(env)? "GE" : env.id;
        return evalExps(exp.body, return_env);
    } else {
        return Error(getErrorMessages(vals));
    }
}

// @@ L4-EVAL-BOX 
// LETREC: Direct evaluation rule without syntax expansion
// 1. extend the env with vars initialized to void (temporary value)
// 2. compute the vals in the new extended env
// 3. update the bindings of the vars to the computed vals
// 4. compute body in extended env
const evalLetrec = (exp: LetrecExp, env: Env): Value | Error => {
    const vars = map((b: Binding) => b.var.var, exp.bindings);
    const vals = map((b: Binding) => b.val, exp.bindings);
    const extEnv = makeExtEnv(vars, repeat(undefined, vars.length), env);
    appliedEnvs[extEnv.id] = isGlobalEnv(env)? "GE" : env.id;
    // @@ Compute the vals in the extended env
    const cvals = map((v: CExp) => applicativeEval(v, extEnv), vals);
    if (hasNoError(cvals)) {
        // Bind vars in extEnv to the new values
        zipWith((bdg, cval) => setFBinding(bdg, cval), extEnv.frame.fbindings, cvals);
        return evalExps(exp.body, extEnv);
    } else {
        return Error(getErrorMessages(cvals));
    }
};

// L4-eval-box: Handling of mutation with set!
const evalSet = (exp: SetExp, env: Env): Value | Error => {
    const v = exp.var.var;
    const val = applicativeEval(exp.val, env);
    if (isError(val))
        return val;
    else {
        const bdg = applyEnvBdg(env, v);
        if (isError(bdg)) {
            return Error(`Var not found ${v}`)
        } else {
            setFBinding(bdg, val);
            return undefined;
        }
    }
};

// ========================================================
// Primitives

const zero: number = 0;
const one: number = 1;

// @Pre: none of the args is an Error (checked in applyProcedure)
// TODO: Add explicit type checking in all primitives
export const applyPrimitive = (proc: PrimOp, args: Value[]): Value | Error =>
    proc.op === "+" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x + y, zero, args) : Error("+ expects numbers only")) :
    proc.op === "-" ? minusPrim(args) :
    proc.op === "*" ? (allT(isNumber, args) ? reduce((x: number, y: number) => x * y, one, args) : Error("* expects numbers only")) :
    proc.op === "/" ? divPrim(args) :
    proc.op === ">" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] > args[1] : Error("> expects numbers or strings only")) :
    proc.op === "<" ? ((allT(isNumber, args) || allT(isString, args)) ? args[0] < args[1] : Error("< expects numbers or strings only")) :
    proc.op === "=" ? args[0] === args[1] :
    proc.op === "not" ? ! args[0] :
    proc.op === "and" ? isBoolean(args[0]) && isBoolean(args[1]) && args[0] && args[1] :
    proc.op === "or" ? isBoolean(args[0]) && isBoolean(args[1]) && (args[0] || args[1]) :
    proc.op === "eq?" ? eqPrim(args) :
    proc.op === "string=?" ? args[0] === args[1] :
    proc.op === "cons" ? consPrim(args[0], args[1]) :
    proc.op === "car" ? carPrim(args[0]) :
    proc.op === "cdr" ? cdrPrim(args[0]) :
    proc.op === "list" ? listPrim(args) :
    proc.op === "list?" ? isListPrim(args[0]) :
    proc.op === "pair?" ? isPairPrim(args[0]) :
    proc.op === "number?" ? typeof(args[0]) === 'number' :
    proc.op === "boolean?" ? typeof(args[0]) === 'boolean' :
    proc.op === "symbol?" ? isSymbolSExp(args[0]) :
    proc.op === "string?" ? isString(args[0]) :
    Error("Bad primitive op " + proc.op);

const minusPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x - y;
    } else {
        return Error(`Type error: - expects numbers ${args}`)
    }
}

const divPrim = (args: Value[]): number | Error => {
    // TODO complete
    let x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return x / y;
    } else {
        return Error(`Type error: / expects numbers ${args}`)
    }
}

const eqPrim = (args: Value[]): boolean | Error => {
    let x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    } else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    } else if (isNumber(x) && isNumber(y)) {
        return x === y;
    } else if (isString(x) && isString(y)) {
        return x === y;
    } else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    } else {
        return false;
    }
}

const carPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val1 :
    Error(`Car: param is not compound ${v}`);

const cdrPrim = (v: Value): Value | Error =>
    isCompoundSExp(v) ? v.val2 :
    Error(`Cdr: param is not compound ${v}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: Value[]): EmptySExp | CompoundSExp =>
    vals.length === 0 ? makeEmptySExp() :
    makeCompoundSExp(first(vals), listPrim(rest(vals)))

const isListPrim = (v: Value): boolean =>
    isEmptySExp(v) || isCompoundSExp(v);

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph, 
}

export const drawEnvDiagram = (pEnv:{}): Tree | Error => {
    let graph = new Graph();
    map((env:Env)=>createEnvOnGraph(env, graph), Object.values(pEnv));
    return {tag:"Tree",rootId:"GE",graph: graph}; 
}
export const evalParseDraw = (s: string): string | Error => {
    let val: Value | Error = evalParse(s);
    if(isError(val)) return val;
    let tree:Tree|Error = drawEnvDiagram(persistentEnv);
    return isError(tree) ? tree:
    (astToDot(tree));    
}

const astToDot = (ast: Tree): string => 
{
    let s: string = dot.write(ast.graph);
    console.log(s);
    return s;
}
//ENV HANDLING
const createEnvOnGraph = (env:Env, graph: Graph): void =>
{
    let id: string = (isExtEnv(env) ? env.id: "GE");
    let env_fbindings:FBinding[] = (isExtEnv(env) ? env.frame.fbindings : unbox(env.frame).fbindings);
    let vars: string = reduce((acc: string, curr: FBinding) => acc + varToStr(curr), "", env_fbindings);
    let label: string = "{" + id + vars + "}";
    createClosuresOnGraph(filter((key: FBinding)=>isClosure(getFBindingVal(key)), env_fbindings), graph, id);
    isExtEnv(env) ? createEnvTOEnvEdges(env, graph) : "";
    graph.setNode(id, {label, shape:"Mrecord"});
}
const createEnvTOEnvEdges = (env:ExtEnv, graph: Graph):void =>
{
    appliedEnvs[env.id]
    let nextID: string = (isExtEnv(env.env) ? env.env.id: "GE");
    let nextAppID: string = appliedEnvs[env.id];
    graph.setEdge(env.id, nextID);
    graph.setNode(nextAppID+env.id+"_link", {label:nextAppID, shape:"plaintext"})
    graph.setEdge(env.id, (nextAppID+env.id+"_link"), {style:"dashed"});
}
//Vars Handling
const varToStr = (currVar: FBinding): string =>
    isClosure(getFBindingVal(currVar)) ? "|<" + currVar.var + ">" + currVar.var +":\\l" : 
    "|" + currVar.var + ":" + currVar.val + "\\l";

//Closures Handling
const createClosuresOnGraph = (fBinding: FBinding[], graph: Graph, envID: string): void =>
{
    map((key: FBinding)=>
    {
        let chkVal: any = getFBindingVal(key)
        if(isClosure(chkVal)){
        let closureEnv: string = isGlobalEnv(chkVal.env) ? "GE" : chkVal.env.id;
        let closureSTR: string[] = makeClosureStr(chkVal);
        let closureID: string = closuredIdsMap.get(chkVal);
        graph.setNode(closureID, {label:closureSTR[0], shape: closureSTR[1], color:closureSTR[2]});
        graph.setEdge(closureID, closureEnv, {tailport:"0" });
        graph.setEdge(envID, closureID, {tailport:getFBindingVar(key) , headport: "0"});
        }
    },fBinding)
}
  
const makeClosureStr = (exp: Closure): string[] => {
    let params: string[] = exp.params.map((v) => v.var);
    let paramsStr: string = "p:" + params.join(", ") + "\\l|";
    let body: string[] = exp.body.map((x) => unparse(x));
    let bodyStr: string = body.join(" ") + "\\l|";
    let closureSymb: string = '<0>\u25EF\u25EF\\l|';
    let label: string = '{' + closureSymb + paramsStr + "b: " + bodyStr + '}';
    let shape: string = 'record';
    let color: string = 'white';
    return [label, shape, color]
}

