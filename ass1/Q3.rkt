#lang racket

(provide (all-defined-out))

;; Signature: ngrams(list-of-symbols, n)
;; Purpose: Return a list of consecutive n symbols
;; Type: [List(Symbol) * Number -> List(List(Symbol))]
;; Example: (ngrams '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat))
;; Precondition: n <= length(list-of-symbols)
;; Tests: (ngrams '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat))
;;        (ngrams '(the cat in the hat) 2) => '((the cat) (cat in) (in the) (the hat))
(define ngrams
  (lambda (lst n)
    (if (>= (get_list_size lst) n)
        (cons (get_n_first_values lst n) (ngrams (cdr lst) n))
        '())))

;; Signature: ngrams-with-padding(list-of-symbols, n)
;; Purpose: Return a list of consecutive n symbols, padding if necessary
;; Type: [List(Symbol) * Number -> List(List(Symbol))]
;; Example: (ngrams-with-padding '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat) (the hat *) (hat * *))
;; Precondition: n <= length(list-of-symbols)
;; Tests: (ngrams-with-padding '(the cat in the hat) 3) => '((the cat in) (cat in the) (in the hat) (the hat *) (hat * *))
;;        (ngrams-with-padding '(the cat in the hat) 2) => '((the cat) (cat in) (in the) (the hat) (hat *))
(define ngrams-with-padding
  (lambda (lst n)
    (if (not (empty? lst))
        (cons (get_n_first_values lst n) (ngrams-with-padding (cdr lst) n))
        '())))
        
;; Signature: get_list_size(list-of-symbols)
;; Purpose: Return the size of a given list
;; Type: [List(Symbol) -> Number]
;; Exmple: (get_list_size('())) => (0)
;; Precondition: true
;; Tests: (get_list_size('())) => (0)
(define get_list_size
  (lambda (lst)
    (if (empty? lst)
        0
        (+ 1 (get_list_size (cdr lst))))))

;; Signature: get_n_first_values(list-of-symbols,n)
;; Purpose: Return a list of the first n elements of the given list
;; Type: [List(Symbol) * Number -> List(List(Symbol))]
;; Exmple: (get_n_first_values '(in the hat) 3) => '(in the hat)
;;         (get_n_first_values '(the hat) 3) => '(the hat *) 
;; Precondition: true
;; Tests: (get_n_first_values '(in the hat) 3) => '(in the hat)
;;        (get_n_first_values '(the hat) 3) => '(the hat *)
(define get_n_first_values
  (lambda (lst n)
    (if (= n 0)
        '()
        (if(empty? lst)
           (cons '* (get_n_first_values lst (- n 1)))
           (cons (car lst) (get_n_first_values (cdr lst) (- n 1)))))))


(ngrams-with-padding '(the cat in the hat) 3)
(ngrams '(the cat in the hat) 6)
