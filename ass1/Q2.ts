// Q2.1
export interface NumberTree {
    root: number;
    children: NumberTree[];
}

export const sumTreeIf:(t:NumberTree, f:((x:number)=>boolean))=>number = 
function(t:NumberTree, f:((x:number)=>boolean)):number{
    return (t.children.map(x=>sumTreeIf(x,f)).reduce((acc:number,cur:number)=>acc+cur,0)+ (f(t.root) ? t.root : 0));
}

// Q2.2
export interface WordTree {
    root: string;
    children: WordTree[];
}

export const sentenceFromTree:(t:WordTree)=>string = 
function(t:WordTree):string{
    return t.root + " " + (t.children.map(x=>sentenceFromTree(x))).reduce((acc:string,cur:string)=> acc + cur,"");
}

// Q2.3
export interface Grade {
    course: string;
    grade: number;
}

export interface Student {
    name: string;
    gender: string;
    grades: Grade[];
}

export interface SchoolClass {
    classNumber: number;
    students: Student[];
}

type school = SchoolClass[];

// Q2.3.1
export const hasSomeoneFailedBiology:(school:SchoolClass[])=>boolean =
function(school:SchoolClass[]):boolean{
    return school.reduce((acc:Student[],cur:SchoolClass)=> acc.concat(cur.students),[]).reduce((acc:Grade[],cur:Student)=>acc.concat(cur.grades),[]).filter(x=>x.course==="biology").reduce((acc:boolean,cur:Grade)=> acc || (cur.grade<56),false);
}

// Q2.3.2
export const allGirlsPassMath:(school:SchoolClass[])=>boolean =
function(school:SchoolClass[]):boolean{
    return school.reduce((acc:Student[],cur:SchoolClass)=> acc.concat(cur.students),[]).filter(x=>x.gender==="Female").reduce((acc:Grade[],cur:Student)=>acc.concat(cur.grades),[]).filter(x=>x.course==="math").reduce((acc:boolean,cur:Grade)=> acc && (cur.grade>=56),true);
}


// Q2.4
export interface YMDDate {
    year: number;
    month: number;
    day: number;
}

export const comesBefore: (date1: YMDDate, date2: YMDDate) => boolean = (date1, date2) => {
    if (date1.year < date2.year) {
        return true;
    }
    if (date1.year === date2.year && date1.month < date2.month) {
        return true;
    }
    if (date1.year === date2.year && date1.month === date2.month && date1.day < date2.day) {
        return true;
    }
    return false;
}

export interface ChargeResult {
    amountLeft: number;
    wallet: Wallet;
}

interface Cash{
    tag: "cash";
    amount: number;
}

interface DebitCard{
    tag: "dc";
    amount: number;
    expirationDate:YMDDate;
}

interface Wallet{
    tag: "wallet";
    paymentMethods: paymentMethod[]
}

type paymentMethod = Cash | DebitCard | Wallet;

/*----------------------constructors--------------------------------------*/
const makeCash = (amount:number): Cash => ({tag:"cash", amount:amount});
const makeDebitCard = (amount:number, expirationDate:YMDDate): DebitCard => ({tag:"dc", amount:amount, expirationDate:expirationDate});
const makeWallet = (paymentMethods:paymentMethod[]): Wallet => ({tag:"wallet", paymentMethods:paymentMethods});


/*----------------------predicates--------------------------------------*/

const isCash = (x: any): x is Cash => x.tag === "cash";
const isDebitCard = (x: any): x is DebitCard => x.tag === "dc";
const isWallet = (x: any): x is Wallet => x.tag === "wallet";


/*----------------------charge-functions--------------------------------------*/

export const chargeCash:(cash:Cash, amountToCharge:number)=> ChargeResult =
function(cash:Cash, amountToCharge:number):ChargeResult{
    return (cash.amount>=amountToCharge) ? ({amountLeft:0, wallet:makeWallet([makeCash(cash.amount-amountToCharge)])}) :
    ({amountLeft:amountToCharge-cash.amount, wallet:makeWallet([makeCash(0)])});
    
}
export const chargeDebit:(debitCard:DebitCard, amountToCharge:number, date:YMDDate)=> ChargeResult =
function(debitCard:DebitCard, amountToCharge:number, date:YMDDate):ChargeResult{
    return (comesBefore(date,debitCard.expirationDate)) ?
    (debitCard.amount>=amountToCharge) ? ({amountLeft:0, wallet:makeWallet([makeDebitCard(debitCard.amount-amountToCharge,debitCard.expirationDate)])}):
        ({amountLeft:amountToCharge-debitCard.amount, wallet:makeWallet([makeDebitCard(0,debitCard.expirationDate)])}):
    ({amountLeft:amountToCharge, wallet:makeWallet([makeDebitCard(debitCard.amount,debitCard.expirationDate)])});
}
export const charge:(paymentMethod:paymentMethod, amountToCharge:number, date:YMDDate)=> ChargeResult = 
function(paymentMethod:paymentMethod, amountToCharge:number, date:YMDDate):ChargeResult{
    return isCash(paymentMethod) ? chargeCash(paymentMethod,amountToCharge):
    isDebitCard(paymentMethod) ? chargeDebit(paymentMethod,amountToCharge, date):
    isWallet(paymentMethod) ? 
        paymentMethod.paymentMethods.reduce((acc:ChargeResult,cur:paymentMethod)=>union(acc, charge(cur, acc.amountLeft, date)),{amountLeft:amountToCharge, wallet: makeWallet([])}):
    ({amountLeft: amountToCharge, wallet: makeWallet([])});

}

export const union:(accumulator:ChargeResult,current:ChargeResult) => ChargeResult = function(accumulator,current):ChargeResult {
    return ({amountLeft: current.amountLeft, wallet: makeWallet(accumulator.wallet.paymentMethods.concat(current.wallet.paymentMethods))});
}
                