// L5-typecheck
import { strict as assert } from 'assert';
import { L5typeof } from './L5-typecheck';
import {parseTE} from './TExp';


// Example:
assert.deepEqual(parseTE("(number | boolean)"), parseTE("(boolean | number)"));
assert.deepEqual(L5typeof(`(lambda ((x : (string | number))) : (string | string | number) x)`),"((number | string) -> (number | string))");
assert.deepEqual(L5typeof(`(lambda ((x : (boolean | number))) : (boolean | number) x)`),`((boolean | number) -> (boolean | number))`);
assert.deepEqual(L5typeof(`(lambda ((x : (boolean | string))) : (boolean | string) x)`),`((boolean | string) -> (boolean | string))`);

//-----------------------------------------  If ---------------------------------------------------//

//assert.deepEqual(L5typeof('(if (< 3 4) "aa" #t)'),'(boolean | string)');
assert.deepEqual(L5typeof('(if (< 1 3) #t 1)'),'(boolean | number)');
assert.deepEqual(L5typeof('(if (= 10 10) #t #f)'),'boolean');
assert.deepEqual(L5typeof("(if (< 7 10) (lambda ((x : (number | boolean))) : (number | boolean) x) 3)"),'(((boolean | number) -> (boolean | number)) | number)');
assert.deepEqual(L5typeof('(lambda ((x : boolean)) : (boolean | string) (if x x "false"))'),'(boolean -> (boolean | string))');

