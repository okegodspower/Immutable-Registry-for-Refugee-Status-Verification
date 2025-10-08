(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-STATUS u101)
(define-constant ERR-INVALID-REFUGEE-ID u102)
(define-constant ERR-INVALID-TIMESTAMP u103)
(define-constant ERR-INVALID-AUTHORITY u104)
(define-constant ERR-STATUS-ALREADY-EXISTS u105)
(define-constant ERR-STATUS-NOT-FOUND u106)
(define-constant ERR-INVALID-EXPIRATION u107)
(define-constant ERR-INVALID-REASON u108)
(define-constant ERR-INVALID-LOCATION u109)
(define-constant ERR-INVALID-COUNTRY u110)
(define-constant ERR-INVALID-DOCUMENT-HASH u111)
(define-constant ERR-INVALID-STATUS-TYPE u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-STATUSES-EXCEEDED u114)
(define-constant ERR-INVALID-GRACE-PERIOD u115)
(define-constant ERR-INVALID-RENEWAL-FEE u116)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u117)
(define-constant ERR-INVALID-HISTORY-LIMIT u118)
(define-constant ERR-INVALID-VERIFIER u119)
(define-constant ERR-INVALID-SCORE u120)
(define-constant ERR-INVALID-RATING u121)
(define-constant ERR-INVALID-COMMENT u122)
(define-constant ERR-INVALID-APPEAL-REASON u123)
(define-constant ERR-INVALID-APPEAL-STATUS u124)
(define-constant ERR-INVALID-BATCH-SIZE u125)

(define-data-var next-status-id uint u0)
(define-data-var max-statuses uint u1000000)
(define-data-var renewal-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-data-var history-limit uint u10)
(define-data-var grace-period uint u30)

(define-map statuses
  uint
  {
    refugee-id: uint,
    status-type: (string-utf8 50),
    timestamp: uint,
    expiration: uint,
    assigner: principal,
    location: (string-utf8 100),
    country: (string-utf8 50),
    document-hash: (buff 32),
    reason: (string-utf8 200),
    active: bool,
    score: uint,
    rating: uint
  }
)

(define-map status-history
  uint
  (list 10 uint)
)

(define-map status-by-refugee
  uint
  uint
)

(define-map appeals
  uint
  {
    status-id: uint,
    appeal-reason: (string-utf8 200),
    appeal-timestamp: uint,
    resolver: principal,
    resolved: bool,
    outcome: bool
  }
)

(define-map verifiers
  principal
  {
    verified: bool,
    score: uint,
    assignments: uint
  }
)

(define-read-only (get-status (id uint))
  (map-get? statuses id)
)

(define-read-only (get-status-history (id uint))
  (map-get? status-history id)
)

(define-read-only (get-appeal (id uint))
  (map-get? appeals id)
)

(define-read-only (get-verifier (p principal))
  (map-get? verifiers p)
)

(define-read-only (is-status-active (id uint))
  (match (map-get? statuses id)
    s (and (get active s) (< block-height (get expiration s)))
    false
  )
)

(define-private (validate-refugee-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-REFUGEE-ID))
)

(define-private (validate-status-type (type (string-utf8 50)))
  (if (or (is-eq type "registered") (is-eq type "asylum-granted") (is-eq type "pending") (is-eq type "denied"))
      (ok true)
      (err ERR-INVALID-STATUS-TYPE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-expiration (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRATION))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-country (ctry (string-utf8 50)))
  (if (and (> (len ctry) u0) (<= (len ctry) u50))
      (ok true)
      (err ERR-INVALID-COUNTRY))
)

(define-private (validate-document-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-DOCUMENT-HASH))
)

(define-private (validate-reason (reason (string-utf8 200)))
  (if (<= (len reason) u200)
      (ok true)
      (err ERR-INVALID-REASON))
)

(define-private (validate-score (score uint))
  (if (<= score u100)
      (ok true)
      (err ERR-INVALID-SCORE))
)

(define-private (validate-rating (rating uint))
  (if (<= rating u5)
      (ok true)
      (err ERR-INVALID-RATING))
)

(define-private (validate-appeal-reason (reason (string-utf8 200)))
  (if (and (> (len reason) u0) (<= (len reason) u200))
      (ok true)
      (err ERR-INVALID-APPEAL-REASON))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-AUTHORITY))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-renewal-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-RENEWAL-FEE))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set renewal-fee new-fee)
    (ok true)
  )
)

(define-public (set-grace-period (new-period uint))
  (begin
    (asserts! (<= new-period u90) (err ERR-INVALID-GRACE-PERIOD))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set grace-period new-period)
    (ok true)
  )
)

(define-public (set-history-limit (new-limit uint))
  (begin
    (asserts! (and (> new-limit u0) (<= new-limit u20)) (err ERR-INVALID-HISTORY-LIMIT))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set history-limit new-limit)
    (ok true)
  )
)

(define-public (register-verifier)
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (map-set verifiers tx-sender { verified: true, score: u0, assignments: u0 })
    (ok true)
  )
)

(define-public (assign-status
  (refugee-id uint)
  (status-type (string-utf8 50))
  (expiration uint)
  (location (string-utf8 100))
  (country (string-utf8 50))
  (document-hash (buff 32))
  (reason (string-utf8 200))
  (score uint)
  (rating uint)
)
  (let (
        (next-id (var-get next-status-id))
        (current-max (var-get max-statuses))
        (authority (var-get authority-contract))
        (verifier (map-get? verifiers tx-sender))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-STATUSES-EXCEEDED))
    (try! (validate-refugee-id refugee-id))
    (try! (validate-status-type status-type))
    (try! (validate-expiration expiration))
    (try! (validate-location location))
    (try! (validate-country country))
    (try! (validate-document-hash document-hash))
    (try! (validate-reason reason))
    (try! (validate-score score))
    (try! (validate-rating rating))
    (asserts! (is-some verifier) (err ERR-INVALID-VERIFIER))
    (asserts! (get verified (unwrap! verifier (err ERR-INVALID-VERIFIER))) (err ERR-INVALID-VERIFIER))
    (asserts! (is-none (map-get? status-by-refugee refugee-id)) (err ERR-STATUS-ALREADY-EXISTS))
    (asserts! (is-some authority) (err ERR-AUTHORITY-NOT-VERIFIED))
    (map-set statuses next-id
      {
        refugee-id: refugee-id,
        status-type: status-type,
        timestamp: block-height,
        expiration: expiration,
        assigner: tx-sender,
        location: location,
        country: country,
        document-hash: document-hash,
        reason: reason,
        active: true,
        score: score,
        rating: rating
      }
    )
    (map-set status-by-refugee refugee-id next-id)
    (map-set status-history next-id (list next-id))
    (map-set verifiers tx-sender
      {
        verified: true,
        score: (+ (get score (unwrap! verifier (err ERR-INVALID-VERIFIER))) score),
        assignments: (+ (get assignments (unwrap! verifier (err ERR-INVALID-VERIFIER))) u1)
      }
    )
    (var-set next-status-id (+ next-id u1))
    (print { event: "status-assigned", id: next-id })
    (ok next-id)
  )
)

(define-public (update-status
  (status-id uint)
  (new-status-type (string-utf8 50))
  (new-expiration uint)
  (new-reason (string-utf8 200))
  (new-score uint)
  (new-rating uint)
)
  (let ((status (map-get? statuses status-id)))
    (match status
      s
        (begin
          (asserts! (is-eq (get assigner s) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-status-type new-status-type))
          (try! (validate-expiration new-expiration))
          (try! (validate-reason new-reason))
          (try! (validate-score new-score))
          (try! (validate-rating new-rating))
          (map-set statuses status-id
            (merge s
              {
                status-type: new-status-type,
                expiration: new-expiration,
                reason: new-reason,
                timestamp: block-height,
                score: new-score,
                rating: new-rating
              }
            )
          )
          (let ((history (default-to (list) (map-get? status-history status-id))))
            (asserts! (< (len history) (var-get history-limit)) (err ERR-INVALID-HISTORY-LIMIT))
            (map-set status-history status-id (append history status-id))
          )
          (print { event: "status-updated", id: status-id })
          (ok true)
        )
      (err ERR-STATUS-NOT-FOUND)
    )
  )
)

(define-public (verify-status (status-id uint))
  (match (map-get? statuses status-id)
    s
      (if (and (get active s) (< block-height (get expiration s)))
          (ok true)
          (ok false)
      )
    (err ERR-STATUS-NOT-FOUND)
  )
)

(define-public (renew-status (status-id uint))
  (let ((status (map-get? statuses status-id)))
    (match status
      s
        (begin
          (asserts! (is-eq tx-sender (get assigner s)) (err ERR-NOT-AUTHORIZED))
          (try! (stx-transfer? (var-get renewal-fee) tx-sender (unwrap! (var-get authority-contract) (err ERR-AUTHORITY-NOT-VERIFIED))))
          (map-set statuses status-id
            (merge s { expiration: (+ (get expiration s) (* (var-get grace-period) u144)) })
          )
          (print { event: "status-renewed", id: status-id })
          (ok true)
        )
      (err ERR-STATUS-NOT-FOUND)
    )
  )
)

(define-public (file-appeal (status-id uint) (appeal-reason (string-utf8 200)))
  (let ((status (map-get? statuses status-id)))
    (match status
      s
        (begin
          (try! (validate-appeal-reason appeal-reason))
          (map-set appeals status-id
            {
              status-id: status-id,
              appeal-reason: appeal-reason,
              appeal-timestamp: block-height,
              resolver: tx-sender,
              resolved: false,
              outcome: false
            }
          )
          (print { event: "appeal-filed", id: status-id })
          (ok true)
        )
      (err ERR-STATUS-NOT-FOUND)
    )
  )
)

(define-public (resolve-appeal (appeal-id uint) (outcome bool))
  (let ((appeal (map-get? appeals appeal-id)))
    (match appeal
      a
        (begin
          (asserts! (is-eq (get resolver a) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (not (get resolved a)) (err ERR-INVALID-APPEAL-STATUS))
          (map-set appeals appeal-id
            (merge a { resolved: true, outcome: outcome })
          )
          (if outcome
              (map-set statuses (get status-id a)
                (merge (unwrap! (map-get? statuses (get status-id a)) (err ERR-STATUS-NOT-FOUND))
                  { active: false }
                )
              )
              (ok true)
          )
          (print { event: "appeal-resolved", id: appeal-id, outcome: outcome })
          (ok true)
        )
      (err ERR-STATUS-NOT-FOUND)
    )
  )
)

(define-public (batch-verify-statuses (status-ids (list 10 uint)))
  (fold batch-verify-iter status-ids (ok (list)))
)

(define-private (batch-verify-iter (id uint) (acc (response (list 10 bool) uint)))
  (match acc
    results
      (match (verify-status id)
        verified (ok (append results verified))
        error (err error)
      )
    error (err error)
  )
)

(define-public (get-status-count)
  (ok (var-get next-status-id))
)

(define-public (deactivate-status (status-id uint))
  (let ((status (map-get? statuses status-id)))
    (match status
      s
        (begin
          (asserts! (is-eq (get assigner s) tx-sender) (err ERR-NOT-AUTHORIZED))
          (map-set statuses status-id (merge s { active: false }))
          (print { event: "status-deactivated", id: status-id })
          (ok true)
        )
      (err ERR-STATUS-NOT-FOUND)
    )
  )
)