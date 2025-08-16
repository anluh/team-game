<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getQuests, createQuest, updateQuest, deleteQuest } from '../firebase'

// Reactive data
const quests = getQuests()
const showForm = ref(false)
const editingQuest = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

// Form data
const questForm = reactive({
  question: '',
  answers: [''],
  qr: '',
  imageName: 'map-1'
})

// Reset form
const resetForm = () => {
  questForm.question = ''
  questForm.answers = ['']
  questForm.qr = ''
  questForm.imageName = 'map-1'
  editingQuest.value = null
  showForm.value = false
  error.value = ''
  success.value = ''
}

// Add new answer field
const addAnswerField = () => {
  questForm.answers.push('')
}

// Remove answer field
const removeAnswerField = (index) => {
  if (questForm.answers.length > 1) {
    questForm.answers.splice(index, 1)
  }
}

// Start creating new quest
const startCreate = () => {
  resetForm()
  showForm.value = true
}

// Start editing quest
const startEdit = (quest) => {
  questForm.question = quest.question
  questForm.answers = [...quest.answers]
  questForm.qr = quest.qr || ''
  questForm.imageName = quest.imageName || 'map-1'
  editingQuest.value = quest.id
  showForm.value = true
  error.value = ''
  success.value = ''
}

// Validate form
const validateForm = () => {
  if (!questForm.question.trim()) {
    error.value = 'Question is required'
    return false
  }
  
  const validAnswers = questForm.answers.filter(answer => answer.trim())
  if (validAnswers.length === 0) {
    error.value = 'At least one answer is required'
    return false
  }
  
  return true
}

// Save quest (create or update)
const saveQuest = async () => {
  if (!validateForm()) return
  
  loading.value = true
  error.value = ''
  
  try {
    // Filter out empty answers
    const cleanAnswers = questForm.answers.filter(answer => answer.trim())
    
    const questData = {
      question: questForm.question.trim(),
      answers: cleanAnswers,
      qr: questForm.qr.trim(),
      imageName: questForm.imageName.trim() || 'map-1'
    }
    
    if (editingQuest.value) {
      await updateQuest(editingQuest.value, questData)
      success.value = 'Question updated successfully!'
    } else {
      await createQuest(questData)
      success.value = 'Question created successfully! All user orders have been updated.'
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = ''
      resetForm()
    }, 2000)
    
  } catch (err) {
    error.value = `Error saving question: ${err.message}`
  } finally {
    loading.value = false
  }
}

// Delete quest
const confirmDelete = async (questId, question) => {
  if (confirm(`Are you sure you want to delete this question: "${question}"?`)) {
    loading.value = true
    error.value = ''
    
    try {
      await deleteQuest(questId)
      success.value = 'Question deleted successfully! All user orders have been updated.'
      setTimeout(() => {
        success.value = ''
      }, 2000)
    } catch (err) {
      error.value = `Error deleting question: ${err.message}`
    } finally {
      loading.value = false
    }
  }
}
</script>

<template>
  <div class="questions-manager">
    <div class="header">
      <h2>Questions Management</h2>
      <button @click="startCreate" class="btn btn-primary" :disabled="loading">
        Add New Question
      </button>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="success" class="alert alert-success">{{ success }}</div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="resetForm">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingQuest ? 'Edit Question' : 'Create New Question' }}</h3>
          <button @click="resetForm" class="close-btn">&times;</button>
        </div>
        
        <form @submit.prevent="saveQuest" class="modal-body">
          <!-- Question Input -->
          <div class="form-group">
            <label for="question">Question:</label>
            <textarea 
              id="question"
              v-model="questForm.question" 
              placeholder="Enter your question here..."
              rows="3"
              required
            ></textarea>
          </div>

          <!-- Answers -->
          <div class="form-group">
            <label>Correct Answers:</label>
            <div v-for="(answer, index) in questForm.answers" :key="index" class="answer-input">
              <input 
                type="text" 
                v-model="questForm.answers[index]" 
                :placeholder="`Answer ${index + 1}`"
                required
              />
              <button 
                type="button" 
                @click="removeAnswerField(index)"
                class="btn btn-danger btn-sm"
                :disabled="questForm.answers.length <= 1"
              >
                Remove
              </button>
            </div>
            <button type="button" @click="addAnswerField" class="btn btn-secondary btn-sm">
              Add Another Answer
            </button>
          </div>

          <!-- QR Code -->
          <div class="form-group">
            <label for="qr">QR Code (optional):</label>
            <input 
              type="text" 
              id="qr"
              v-model="questForm.qr" 
              placeholder="QR code data or URL"
            />
          </div>

          <!-- Success Image Name -->
          <div class="form-group">
            <label for="imageName">Success Image Name:</label>
            <input 
              type="text" 
              id="imageName"
              v-model="questForm.imageName" 
              placeholder="Image name (e.g., map-1, map-2, map-3)"
            />
            <small class="field-help">
              This corresponds to the image file shown when the answer is correct (e.g., "map-1" for map-1.jpg). Default: map-1
            </small>
          </div>

          <div class="modal-footer">
            <button type="button" @click="resetForm" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Saving...' : (editingQuest ? 'Update Question' : 'Create Question') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Questions List -->
    <div class="questions-list">
      <div v-if="quests.length === 0" class="empty-state">
        <p>No questions found. Create your first question!</p>
      </div>
      
      <div v-for="quest in quests" :key="quest.id" class="question-card">
        <div class="question-content">
          <h4>{{ quest.question }}</h4>
          <div class="answers">
            <strong>Correct Answers:</strong>
            <span v-for="(answer, index) in quest.answers" :key="index" class="answer-tag">
              {{ answer }}
            </span>
          </div>
          <div v-if="quest.qr" class="qr">
            <strong>QR:</strong> {{ quest.qr }}
          </div>
          <div class="image-name">
            <strong>Success Image:</strong> {{ quest.imageName || 'map-1' }}.jpg
          </div>
        </div>
        
        <div class="question-actions">
          <button @click="startEdit(quest)" class="btn btn-secondary btn-sm" :disabled="loading">
            Edit
          </button>
          <button 
            @click="confirmDelete(quest.id, quest.question)" 
            class="btn btn-danger btn-sm"
            :disabled="loading"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.questions-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #333;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Alerts */
.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid #dee2e6;
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.answer-input {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.answer-input input {
  flex: 1;
}

.field-help {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
  display: block;
}

/* Questions List */
.questions-list {
  margin-top: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.question-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.question-content {
  flex: 1;
}

.question-content h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.answers {
  margin-bottom: 8px;
  color: #333;
}

.answer-tag {
  display: inline-block;
  background-color: #e9ecef;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin: 2px 4px 2px 0;
}

.qr {
  font-size: 14px;
  color: #666;
}

.image-name {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.question-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}

@media (max-width: 768px) {
  .question-card {
    flex-direction: column;
    gap: 12px;
  }
  
  .question-actions {
    margin-left: 0;
    align-self: flex-end;
  }
  
  .answer-input {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 