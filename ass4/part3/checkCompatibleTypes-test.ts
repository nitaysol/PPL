// L5-typecheck
import { strict as assert } from 'assert';
import { checkCompatibleTypes } from './L5-typecheck';
import { makeBoolTExp, makeNumTExp, makeProcTExp, makeTVar, makeVoidTExp, parseTE, unparseTExp, makeUnionTExp, makeStrTExp } from './TExp';


// Comparing 2 atomic types
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeNumTExp()),false);
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(), makeBoolTExp()),true);

//option1
assert.deepEqual(checkCompatibleTypes(makeNumTExp(),makeBoolTExp()),false);
assert.deepEqual(checkCompatibleTypes(makeNumTExp(), makeNumTExp()),true);

//option2
assert.deepEqual(checkCompatibleTypes(makeStrTExp(),makeUnionTExp([makeBoolTExp(),makeNumTExp()])),false);
assert.deepEqual(checkCompatibleTypes(makeNumTExp(),makeUnionTExp([makeBoolTExp(),makeNumTExp()])),true);
assert.deepEqual(checkCompatibleTypes(makeBoolTExp(),makeUnionTExp([makeBoolTExp(),makeNumTExp()])),true);

//option3
assert.deepEqual(checkCompatibleTypes(makeStrTExp(),makeProcTExp([makeNumTExp()], makeNumTExp())),false);

//option4
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeBoolTExp()),false);

//option5
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeUnionTExp([makeBoolTExp(),makeNumTExp()])),true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeUnionTExp([makeStrTExp(),makeNumTExp()])),false);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeUnionTExp([makeBoolTExp(),makeNumTExp(),makeStrTExp()])),true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeUnionTExp([makeNumTExp(),makeBoolTExp()])),true);
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeBoolTExp(),makeNumTExp()]),makeUnionTExp([makeNumTExp(),makeBoolTExp(),makeProcTExp([makeBoolTExp()],makeNumTExp())])),true);


//option6
assert.deepEqual(checkCompatibleTypes(makeUnionTExp([makeNumTExp(), makeBoolTExp(), makeStrTExp()]), makeProcTExp([makeNumTExp()], makeBoolTExp())), false);

//option7
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp()], makeNumTExp()),makeNumTExp()),false);

//option8
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp()], makeNumTExp()),makeUnionTExp([makeBoolTExp(),makeNumTExp()])),false);

//option9
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp()], makeNumTExp()),makeProcTExp([makeNumTExp()], makeNumTExp())),true);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeNumTExp()], makeNumTExp()),makeProcTExp([makeBoolTExp()], makeNumTExp())),false);
assert.deepEqual(checkCompatibleTypes(makeProcTExp([makeBoolTExp(), makeUnionTExp([makeBoolTExp(), makeNumTExp()])], makeBoolTExp()), makeProcTExp([makeBoolTExp(), makeUnionTExp([makeNumTExp(), makeBoolTExp()])], makeBoolTExp() )), true);
