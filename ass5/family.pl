% Signature: parent(Parent, Child)/2
% Purpose: Parent is the parent of the child.

parent(abraham, isaac).
parent(isaac, jacob).
parent(sarah, isaac).
parent(jacob, joseph).
parent(rebbeca, esav).
parent(rebbeca,jacob).
parent(isaac, esav).

% Signature: male(Person)/1
% Purpose: The person is male.

male(abraham).
male(isaac).
male(joseph).

% Signature: female(Person)/1
% Purpose: The person is female.

female(sarah).
female(rebbeca).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%              Solution              %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% Signature: siblings(Person1, Person2)/2
% Purpose: Person1 and Person2 are siblings.
% Example:
% ?- siblings(X, Y).
% X = jacob, Y = esav;
% X = esav, Y = jacob

siblings(X, Y) :-
    parent(F, X), parent(F, Y),
    parent(M, X), parent(M, Y),
    male(F), female(M),X\=Y.


% Signature: ancestor(Ancestor, Descendant)/2
% Purpose: Ancestor is an ancestor of Descendant.
ancestor(A,D) :- parent(A,D).                  %1
ancestor(A,D) :- parent(A,P), ancestor(P,D).   %2


% Signature: relatives(Person1, Person2)/2
% Purpose: Person1 and Person2 are relatives.
% Example:
% ?- relatives(isaac, Y).
% Y = jacob ;
% Y = esav ;
% Y = joseph

relatives(X, Y) :- ancestor(Z,X), ancestor(Z,Y), X\=Y.
