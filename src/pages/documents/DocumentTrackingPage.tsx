import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Import sub-pages
import { DocumentsList } from './DocumentsList'
import { DocumentDetailsPage } from './DocumentDetailsPage'
import { CreateDocumentPage } from './CreateDocumentPage'

export function DocumentTrackingPage() {
  return (
    <Routes>
      <Route path="/" element={<DocumentsList />} />
      <Route path="/create" element={<CreateDocumentPage />} />
      <Route path="/details/:id" element={<DocumentDetailsPage />} />
    </Routes>
  )
}