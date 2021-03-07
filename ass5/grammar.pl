% Scheme sublanguage simplified grammar encoded in Prolog.
% Each syntactic category is implemented as a predicate that holds
% when a list of strings belongs to the category.

% sc/1, a.k.a "S Category" is the top category.
% Precondition: X is bound.
% Examples:
% ?- sc([a]).                % a
% true
% ?- sc([1]).                % 1
% true
% ?- Sc(['(', '+', 1, 2, ')']).				% (+ 1 2)
% true
% ?- sc(['(', '+', 1, 2, '(', '+', 1, 2, ')', ')']).				% (+ 1 2 (+ 1 2))
% true
% An example for the exercise of lambda implementation:
% ?- sc(['(','+' , 1, '(', '+',  '(',  lambda, '(', ')', 3, ')', ')' , ')']).				% (+ 1 (+ (lambda () 3)))
% true

sc(X) :- atomc(X).
sc(X) :- compoundc(X).

atomc(X) :- numberc(X).
atomc(X) :- booleanc(X).
atomc(X) :- stringc(X).

compoundc(X) :-lambdac(X).
compoundc(X) :-regularformc(X).

lambdac(Z) :-
	append([['('],[lambda],['('], X,[')'], Y,[')']],Z),
	manyst(X),
	sc(Y).

% The append must appear first to avoid free recursion.
% This is why there must be a precondition to sc/1.
regularformc(Z) :-
	append([['('], X, Y, [')']], Z),
	stringc(X),
	manysc(Y).
% This predicate parses zero or more concatenated "sc" elements
manysc([]).
manysc(Z) :-
	append(X, Y, Z),
	sc(X),
	manysc(Y).

numberc([X]) :-
	number(X).

booleanc(['#t']).
booleanc(['#f']).

stringc([X]) :-
	atom(X),
	X \= '(',    % Succeeds when X is not unifiable with '('
	X \= ')',
	X \= '#t',
	X \= '#f'.


manyst([]).
manyst(Z) :-
	append(X, Y, Z),
	string(X),
	manyst(Y).
