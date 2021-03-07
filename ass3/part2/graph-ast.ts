import { Graph } from "graphlib";
import dot = require("graphlib-dot");
import { length, map, range, zipWith } from "ramda";
import {
    AtomicExp, Exp, IfExp, Parsed, VarDecl, isAtomicExp, DefineExp, AppExp, ProcExp,
    isAppExp, isDefineExp, isExp, isIfExp, isProcExp, parse, unparse, isProgram, makeStrExp, isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, CExp, isLetExp, Binding, isLitExp, isDottedPair } from "./L4-ast";
import { safeF2, safeFL, safeF } from "./error";
import { isError, isString, isNumber, isBoolean, isSymbol } from "util";
import { SExp, isEmptySExp, isCompoundSExp, isSymbolSExp, isClosure } from "./L4-value";

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

interface Tree {
    tag: "Tree",
    rootId: string,
    graph: Graph, 
}

export const isTree = (x: any): x is Tree => x.tag === "Tree";

const makeLeaf = (label: string): Tree => {
    let graph = new Graph();
    const headId = generateId();
    graph.setNode(headId, { label, shape: "record" });
    return { tag: "Tree", rootId: headId, graph };
}


const makeTree = (label: string, nodes: Tree[], edgesLabels: string[]): Tree => {
    let graph = new Graph();
    const headId = generateId();
    graph.setNode(headId, { label, shape: "record" });
    zipWith(
        (t, edgeLabel) => {
            map(n => graph.setNode(n, t.graph.node(n)), t.graph.nodes());
            map(e => graph.setEdge(e.v, e.w, t.graph.edge(e)), t.graph.edges());
            graph.setEdge(headId, t.rootId, {label: edgeLabel});
        },
        nodes,
        edgesLabels
    )
    return { tag: "Tree", rootId: headId, graph };
}

const astToDot = (ast: Tree): string => dot.write(ast.graph);

const expToTree = (exp: string) =>
    safeF(astToDot)(safeF(makeAST)(parse(exp)));

export const makeAST = (exp: Parsed): Tree | Error =>
    isError(exp) ? exp:
    isProgram(exp) ? makeTree(exp.tag, [ExpsArrayToAST(exp.exps)],["exps"]):
    isDefineExp(exp) ? makeTree(exp.tag, [VarDeclToAST(exp.var)].concat([<Tree>makeAST(exp.val)]),["var","val"]):
    CexpToAST(exp);

export const CexpToAST = (exp:CExp) : Tree =>
    isAtomicExp(exp) ? AtomicToAST(exp) :
    isAppExp(exp) ? makeTree(exp.tag,[CexpToAST(exp.rator)].concat(CexpArrayToAST(exp.rands)),["rator","rands"]):
    isIfExp(exp) ? makeTree(exp.tag,[CexpToAST(exp.test),CexpToAST(exp.then),CexpToAST(exp.alt)],["test","then","alt"]):
    isProcExp(exp) ? makeTree(exp.tag,[VarDeclArrayToAST(exp.args),CexpArrayToAST(exp.body)],["args","body"]):
    isLetExp(exp) ? makeTree(exp.tag,[BindingArrayToAST(exp.bindings),CexpArrayToAST(exp.body)],["bindings","body"]):
    isLitExp(exp) ? makeTree(exp.tag,[SexpToAST(exp.val)],["val"]):
    undefined;

export const ExpsArrayToAST = (exp: Exp[]) : Tree =>
    makeTree(":",(<Tree[]>exp.map(makeAST)),Object.keys(exp));

export const CexpArrayToAST = (exp: CExp[]) : Tree =>
    makeTree(":",exp.map(CexpToAST),Object.keys(exp));

export const VarDeclToAST = (exp: VarDecl) : Tree =>
    makeTree(exp.tag,[makeLeaf(exp.var)],["var"]);

export const VarDeclArrayToAST = (exp: VarDecl[]) : Tree =>
    makeTree(":",exp.map(VarDeclToAST),Object.keys(exp));

export const SexpToAST = (exp: SExp) : Tree =>
    isEmptySExp(exp) ? makeLeaf(exp.tag):
    isNumber(exp) ? makeLeaf(exp.toString()):
    isBoolean(exp) ? makeLeaf(exp.toString()):
    isString(exp) ? makeLeaf(exp):
    isSymbolSExp(exp) ? makeTree(exp.tag,[makeLeaf(exp.val)],["val"]):
    isCompoundSExp(exp) ? makeTree(exp.tag,[SexpToAST(exp.val1),SexpToAST(exp.val2)],["val1","val2"]):
    undefined;
    
export const BindingToAST = (exp: Binding) : Tree =>
    makeTree(exp.tag, [VarDeclToAST(exp.var), CexpToAST(exp.val)],["var","val"]);

export const BindingArrayToAST = (exp: Binding[]) : Tree =>
    makeTree(":",exp.map(BindingToAST),Object.keys(exp));

export const AtomicToAST = (exp: AtomicExp) : Tree =>
    isNumExp(exp) ? makeTree(exp.tag,[makeLeaf(exp.val.toString())],["val"]):
    isBoolExp(exp) ? makeTree(exp.tag,[makeLeaf(exp.val.toString())],["val"]):
    isStrExp(exp) ? makeTree(exp.tag,[makeLeaf(exp.val)],["val"]):
    isPrimOp(exp) ? makeTree(exp.tag,[makeLeaf(exp.op)],["op"]):
    makeTree(exp.tag,[makeLeaf(exp.var)],["var"]);

// Tests. Please uncomment
// const p1 = "(define x 4)";
// console.log(expToTree(p1));

// const p2 = "(define y (+ x 4))";
// console.log(expToTree(p2));

// const p3 = "(if #t (+ x 4) 6)";
// console.log(expToTree(p3));

// const p4 = "(lambda (x y) x)";
// console.log(expToTree(p4));

// const p5 = "(define my-list '(1 2))";
// console.log(expToTree(p5));