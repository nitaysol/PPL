% Signature: contained(List1, List2)/2
% Purpose: All elements in List1 appear in List2 in some (possibly different) order.
% Precondition: List2 is fully instantiated
% Example:
% ?- contained(X, [1, 2]).
% X = [1, 2];
% X = [2, 1];
% X = [1];
% X = [2];

contained(X, Y) :-
    X = [First | Xrest],
    member(First, Y),
    selectchk(First, Y, Rest),
    contained(Xrest, Rest).

contained(X, Y) :-
    Y = Y,
    X = [].
