#lang racket


(define make-tree list)#|[Tree * ... * Tree -> Tree]|# 
(define add-subtree cons) #|[Tree * Tree -> Tree]|#
(define make-leaf (lambda (d) d)) #|[T -> Tree]|#
(define empty-tree empty) #|Empty-Tree|#
(define first-subtree car) #|[Tree -> Tree]|#
(define rest-subtrees cdr) #|[Tree -> Tree]|#
(define leaf-data (lambda (x) x)) #|[Tree -> T]|#
(define composite-tree? pair?) #|[T -> Boolean]|#
(define leaf? (lambda (t) (not (list? t)))) #|[T -> Boolean]|#
(define empty-tree? empty?) #|[T -> Boolean]|#

;copied from class material
(define empty-lzl '())
(define empty-lzl? empty?)
(define cons-lzl cons)
(define head car)

;; Type: [LZL(T) -> LZL(T)]
;; Precondition: Input is non-empty
;; Note that this *executes* the continuation 
(define tail
  (lambda (lzl)
    ((cdr lzl))))

;; Signature: lz-lst-append(lz1, lz2)
;; Type: [Lzl(T) * Lzl(T) -> Lzl(T)]
(define lzl-append
  (lambda (lz1 lz2)
    (if (empty-lzl? lz1)
        lz2
        (cons-lzl (head lz1)
                  (lambda () (lzl-append (tail lz1) lz2))))))

;/copied from class material

;Signature: tree->leaves(tree)
;Type: [Tree<T> -> List(T)]
;Purpose: returns an ordered list of the labels which appear in the leaves of the tree
;Pre-condition: recieves unlabeled tree
(define tree->leaves
  (lambda (tree)
    (if (empty-tree? tree)
    '()
    (if (leaf? tree)
        (cons (leaf-data tree) '())
        (append (tree->leaves (first-subtree tree)) (tree->leaves (rest-subtrees tree))
            )))))

;Signature: tree->lz-leaves(tree)
;Type: [Tree<T> -> Lzl(T)]
;Purpose: returns a lazy-list of the labels which appear in the leaves of the tree
;Pre-condition: recieves unlabeled tree
(define tree->lz-leaves
  (lambda (tree)
    (if (empty-tree? tree)
    empty-lzl
    (if (leaf? tree)
        (cons (leaf-data tree) (lambda () '()))
        (lzl-append (tree->lz-leaves (first-subtree tree)) (tree->lz-leaves (rest-subtrees tree))
            )))))

;Signature:  same-leaves?(tree1, tree2)
;Type: [Tree<T1> X Tree<T2> -> Boolean | Pair(<T1>, <T2>]
;Purpose: returns #t if both trees have the same leaves
;Pre-condition: recieves unlabeled tree
(define same-leaves?
  (lambda (tree1 tree2)
    (same-lz-leaves? (tree->lz-leaves tree1) (tree->lz-leaves tree2))))

;Signature:  same-lz-leaves?(lzl1, lzl2)
;Type: [Lzl<T1> X Lzl<T2> -> Boolean | Pair(<T1>, <T2>]
;Purpose: returns #t if both trees have the same leaves or if #f return a pair  - used by same-leaves?
;Pre-condition: recieves two lazy lists which contain the leaves of unlabeled trees
(define same-lz-leaves?
  (lambda (lzl1 lzl2)
    (if (empty-lzl? lzl1)
        (if (empty-lzl? lzl2)
            #t
            (cons '() (head lzl2)))
        (if (empty-lzl? lzl2)
            (cons (head lzl1) '())
             (if (eq? (head lzl1) (head lzl2))
                 (same-lz-leaves? (tail lzl1) (tail lzl2))
                 (cons (head lzl1) (head lzl2)))
            )
    )))
 
