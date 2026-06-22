// ============================================================================
// 🧠 APP STATE & CONFIG
// ============================================================================

const API_BASE = '/api';

// Current State
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let activeTab = 'today'; // 'today' or 'week'
let selectedDateStr = null; // YYYY-MM-DD clicked on calendar
let activeDates = []; // List of YYYY-MM-DD strings with logged activities

// Elements
const elQuoteText = document.getElementById('quote-text');
const elQuoteAuthor = document.getElementById('quote-author');
const elQuoteBadge = document.getElementById('quote-badge');
const elIncludeSecrets = document.getElementById('include-secrets-toggle');
const elNewQuoteBtn = document.getElementById('new-quote-btn');
const elSecretQuoteBtn = document.getElementById('secret-quote-btn');

const elAddQuoteTrigger = document.getElementById('add-quote-trigger');
const elAddQuoteForm = document.getElementById('add-quote-form');
const elAddQuoteArrow = document.getElementById('add-quote-arrow');
const elNewQuoteInput = document.getElementById('new-quote-input');
const elNewAuthorInput = document.getElementById('new-author-input');
const elNewIsSecretCheckbox = document.getElementById('new-is-secret-checkbox');

const elCalendarMonthTitle = document.getElementById('calendar-month-title');
const elCalendarDaysGrid = document.getElementById('calendar-days-grid');
const elPrevMonthBtn = document.getElementById('prev-month-btn');
const elNextMonthBtn = document.getElementById('next-month-btn');

const elChecklistContainer = document.getElementById('checklist-items-container');
const elChecklistProgressText = document.getElementById('checklist-progress-text');
const elChecklistProgressBar = document.getElementById('checklist-progress-bar');

const elTodoForm = document.getElementById('add-todo-form');
const elTodoInput = document.getElementById('todo-input');
const elTodoList = document.getElementById('todo-items-list');
const elTodoCountBadge = document.getElementById('todo-count-badge');

const elLogActivityForm = document.getElementById('log-activity-form');
const elActivityInput = document.getElementById('activity-input');
const elTabTodayBtn = document.getElementById('tab-today-btn');
const elTabWeekBtn = document.getElementById('tab-week-btn');
const elFeedTodayList = document.getElementById('feed-today-list');
const elFeedWeekList = document.getElementById('feed-week-list');

const elDateDetailsCard = document.getElementById('date-details-card');
const elSelectedDateTitle = document.getElementById('selected-date-title');
const elRetroActivityForm = document.getElementById('retro-activity-form');
const elRetroActivityInput = document.getElementById('retro-activity-input');
const elSelectedDateList = document.getElementById('selected-date-list');
const elCloseDetailsBtn = document.getElementById('close-details-btn');

const elToastContainer = document.getElementById('toast-container');

// Background images list
const BACKGROUNDS = [
  'images/google_office.png',
  'images/going_abroad.png',
  'images/kumaraparvatha_trek.png',
  'images/badminton_victory.png',
  'images/gym_morning.png',
  'images/study_coding.png',
  'images/morning_meditation.png',
  'images/success_summit.png',
  'images/thailand_lanterns.png',
  'images/kyoto_bamboo.png'
];
let currentBgIndex = 0;

// Vision Board Data
const DREAMS = [
  { id: 'google', title: 'Work at Google', image: 'images/google_office.png' },
  { id: 'abroad', title: 'Travel Abroad', image: 'images/going_abroad.png' },
  { id: 'trek', title: 'Conquer Kumaraparvatha', image: 'images/kumaraparvatha_trek.png' },
  { id: 'badminton', title: 'Win Badminton Matches', image: 'images/badminton_victory.png' },
  { id: 'gym', title: '5:30 Gym Consistency', image: 'images/gym_morning.png' },
  { id: 'code', title: 'Master Coding & Skills', image: 'images/study_coding.png' },
  { id: 'meditation', title: 'Daily Mindfulness', image: 'images/morning_meditation.png' },
  { id: 'summit', title: 'Reach Full Potential', image: 'images/success_summit.png' },
  { id: 'thailand', title: 'Thailand Light Festival', image: 'images/thailand_lanterns.png' },
  { id: 'kyoto', title: 'Explore Kyoto, Japan', image: 'images/kyoto_bamboo.png' }
];
let achievedDreams = JSON.parse(localStorage.getItem('scheduleRightAchievedDreams') || '[]');
const elDreamsGrid = document.getElementById('dreams-grid');


// Notepad Elements
const elFirstTimesForm = document.getElementById('add-first-time-form');
const elFirstTimeInput = document.getElementById('first-time-input');
const elFirstTimesList = document.getElementById('first-times-list');
const elFirstTimesCountBadge = document.getElementById('first-times-count-badge');


// ============================================================================
// 🔔 UTILITIES & TOASTS
// ============================================================================

// Display toast notifications
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', isError ? 'alert-triangle' : 'check-circle-2');
  toast.appendChild(icon);
  
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  
  elToastContainer.appendChild(toast);
  lucide.createIcons();
  
  // Slide out and delete
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Convert Date object to local YYYY-MM-DD
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date into human-readable format
function formatHumanDate(dateStr) {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', options);
}

// Format Time completed (HH:MM)
function formatTimeStr(timeObj) {
  if (!timeObj) return '';
  // SQL server time format can be ISO or string. Let's parse.
  if (typeof timeObj === 'string') {
    return timeObj.substring(0, 5); // Returns HH:MM
  }
  const d = new Date(timeObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Set Today Header Dates
function setupHeaderDates() {
  const today = new Date();
  document.getElementById('current-day-num').textContent = String(today.getDate()).padStart(2, '0');
  document.getElementById('current-day-name').textContent = today.toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('current-month-year').textContent = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================================================
// 💬 QUOTE GENERATOR CONTROLLERS
// ============================================================================

async function fetchRandomQuote(secretOnly = false) {
  try {
    const includeSecrets = elIncludeSecrets.checked;
    let url = `${API_BASE}/quotes/random`;
    
    if (secretOnly) {
      url += '?secret=true';
    } else if (includeSecrets) {
      url += '?includeSecrets=true';
    }

    // Apply fade-out animation
    elQuoteText.style.opacity = 0;
    elQuoteAuthor.style.opacity = 0;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not retrieve quote.");
    const data = await res.json();

    setTimeout(() => {
      const text = data.QuoteText || data.quotetext || data.quoteText || '';
      const author = data.Author || data.author || data.AuthorName || 'Unknown';
      const isSecret = data.IsSecret || data.issecret || data.isSecret;

      elQuoteText.textContent = `"${text}"`;
      elQuoteAuthor.textContent = `— ${author}`;
      
      if (isSecret) {
        elQuoteBadge.style.display = 'inline-block';
        elQuoteBadge.textContent = 'Personal Secret';
      } else {
        elQuoteBadge.style.display = 'none';
      }
      
      // Fade back in
      elQuoteText.style.opacity = 1;
      elQuoteAuthor.style.opacity = 1;
    }, 250);

  } catch (err) {
    showToast(err.message, true);
  }
}

// Submit custom quote form
async function handleAddQuoteSubmit(e) {
  e.preventDefault();
  const quoteText = elNewQuoteInput.value.trim();
  const author = elNewAuthorInput.value.trim() || 'Myself';
  const isSecret = elNewIsSecretCheckbox.checked;

  if (!quoteText) return;

  try {
    const res = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteText, author, isSecret })
    });

    if (!res.ok) throw new Error("Failed to add quote to database.");
    
    showToast("Added to your library successfully!");
    
    // Reset form & close accordion
    elNewQuoteInput.value = '';
    elNewAuthorInput.value = '';
    elNewIsSecretCheckbox.checked = false;
    elAddQuoteForm.classList.add('hidden');
    elAddQuoteArrow.style.transform = 'rotate(0deg)';
    
    // Highlight the newly added quote
    const data = await res.json();
    const text = data.QuoteText || data.quotetext || data.quoteText || '';
    const author = data.Author || data.author || data.AuthorName || 'Unknown';
    const isSecret = data.IsSecret || data.issecret || data.isSecret;

    elQuoteText.textContent = `"${text}"`;
    elQuoteAuthor.textContent = `— ${author}`;
    if (isSecret) {
      elQuoteBadge.style.display = 'inline-block';
      elQuoteBadge.textContent = 'Personal Secret';
    } else {
      elQuoteBadge.style.display = 'none';
    }

  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================================
// 📋 HABIT CHECKLIST CONTROLLERS
// ============================================================================

async function fetchChecklist() {
  try {
    const res = await fetch(`${API_BASE}/checklist`);
    if (!res.ok) throw new Error("Could not retrieve daily checklist.");
    const checklist = await res.json();

    // Render Checklist
    elChecklistContainer.innerHTML = '';
    let completedCount = 0;

    checklist.forEach(item => {
      const itemId = item.ItemID || item.itemid || item.itemId;
      const itemName = item.ItemName || item.itemname || item.itemName;
      const isCompleted = item.IsCompleted || item.iscompleted || item.isCompleted;

      if (isCompleted) completedCount++;

      const itemEl = document.createElement('div');
      itemEl.className = `checklist-item ${isCompleted ? 'checked' : ''}`;
      itemEl.setAttribute('data-id', itemId);
      itemEl.setAttribute('data-name', itemName);

      itemEl.innerHTML = `
        <div class="checkbox-custom">
          <i data-lucide="check"></i>
        </div>
        <span class="checklist-item-text">${itemName}</span>
      `;

      itemEl.addEventListener('click', () => toggleChecklistItem(itemName, !isCompleted));
      elChecklistContainer.appendChild(itemEl);
    });

    // Update Progress
    const totalItems = checklist.length || 1;
    elChecklistProgressText.textContent = `${completedCount}/${totalItems}`;
    const progressPercent = (completedCount / totalItems) * 100;
    elChecklistProgressBar.style.width = `${progressPercent}%`;

    lucide.createIcons();
  } catch (err) {
    elChecklistContainer.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i>Error loading checklist.</div>`;
    lucide.createIcons();
  }
}

async function toggleChecklistItem(itemName, isCompleted) {
  try {
    const res = await fetch(`${API_BASE}/checklist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, isCompleted })
    });

    if (!res.ok) throw new Error("Failed to toggle item.");
    
    // Refresh feeds, calendar highlight, and checklist
    await fetchChecklist();
    await fetchActiveDates();
    renderCalendar();
    
    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }

    showToast(isCompleted ? `Completed: ${itemName}` : `Removed: ${itemName}`);
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================================
// 📝 DYNAMIC TODO CONTROLLERS
// ============================================================================

async function fetchTodos() {
  try {
    const res = await fetch(`${API_BASE}/todo`);
    if (!res.ok) throw new Error("Could not fetch to-do items.");
    const todos = await res.json();

    elTodoList.innerHTML = '';
    
    if (todos.length === 0) {
      elTodoList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="sparkles"></i>
          <span>No tasks. Add something to get started!</span>
        </div>
      `;
      elTodoCountBadge.textContent = "0 tasks";
      lucide.createIcons();
      return;
    }

    elTodoCountBadge.textContent = `${todos.filter(t => !(t.IsCompleted || t.iscompleted || t.isCompleted)).length} pending`;

    todos.forEach(todo => {
      const taskId = todo.TaskID || todo.taskid || todo.taskId;
      const taskName = todo.TaskName || todo.taskname || todo.taskName;
      const isCompleted = todo.IsCompleted || todo.iscompleted || todo.isCompleted;

      const todoEl = document.createElement('div');
      todoEl.className = `todo-item ${isCompleted ? 'checked' : ''}`;

      todoEl.innerHTML = `
        <div class="todo-item-left">
          <div class="checkbox-custom">
            <i data-lucide="check"></i>
          </div>
          <span class="todo-text">${taskName}</span>
        </div>
        <button class="todo-delete-btn" aria-label="Delete task">
          <i data-lucide="trash-2"></i>
        </button>
      `;

      // Checkbox click
      todoEl.querySelector('.todo-item-left').addEventListener('click', () => {
        toggleTodo(taskId, !isCompleted);
      });

      // Delete click
      todoEl.querySelector('.todo-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTodo(taskId);
      });

      elTodoList.appendChild(todoEl);
    });

    lucide.createIcons();
  } catch (err) {
    elTodoList.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i>Failed to load tasks.</div>`;
    lucide.createIcons();
  }
}

async function handleAddTodo(e) {
  e.preventDefault();
  const taskName = elTodoInput.value.trim();
  if (!taskName) return;

  try {
    const res = await fetch(`${API_BASE}/todo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskName })
    });

    if (!res.ok) throw new Error("Could not add task.");
    elTodoInput.value = '';
    
    await fetchTodos();
    showToast(`Added task: ${taskName}`);
  } catch (err) {
    showToast(err.message, true);
  }
}

async function toggleTodo(id, isCompleted) {
  try {
    const res = await fetch(`${API_BASE}/todo/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted })
    });

    if (!res.ok) throw new Error("Could not update task status.");
    const data = await res.json();

    await fetchTodos();
    await fetchActiveDates();
    renderCalendar();

    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }

    showToast(isCompleted ? `Finished task: ${data.taskName}` : `Marked incomplete: ${data.taskName}`);
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteTodo(id) {
  try {
    const res = await fetch(`${API_BASE}/todo/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error("Could not delete task.");
    await fetchTodos();
    await fetchActiveDates();
    renderCalendar();

    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }

    showToast("Task deleted.");
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================================
// 📈 ACTIVITY LOGS & FEEDS
// ============================================================================

async function fetchTodayActivities() {
  try {
    const res = await fetch(`${API_BASE}/activities/today`);
    if (!res.ok) throw new Error("Failed to load today's activities.");
    const activities = await res.json();

    elFeedTodayList.innerHTML = '';
    
    if (activities.length === 0) {
      elFeedTodayList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="edit-3"></i>
          <span>Nothing logged yet. Keep moving forward!</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    activities.forEach(act => {
      const logId = act.LogID || act.logid || act.logId;
      const activityText = act.ActivityText || act.activitytext || act.activityText;
      const timeCompleted = act.TimeCompleted || act.timecompleted || act.timeCompleted;

      const actEl = document.createElement('div');
      actEl.className = 'feed-item';
      
      const timeStr = formatTimeStr(timeCompleted);

      actEl.innerHTML = `
        <span class="feed-item-dot"></span>
        <div class="feed-item-details">
          <p class="feed-item-text">${activityText}</p>
          <div class="feed-item-meta">
            <span class="feed-item-time">${timeStr ? timeStr : 'Just Now'}</span>
            <button class="feed-delete-btn" onclick="deleteActivityLog(${logId})" title="Delete log">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>
      `;
      elFeedTodayList.appendChild(actEl);
    });

    lucide.createIcons();
  } catch (err) {
    elFeedTodayList.innerHTML = `<div class="empty-state">Failed to load feed.</div>`;
  }
}

async function fetchWeeklyActivities() {
  try {
    const res = await fetch(`${API_BASE}/activities/week`);
    if (!res.ok) throw new Error("Failed to load weekly activities.");
    const activities = await res.json();

    elFeedWeekList.innerHTML = '';
    
    if (activities.length === 0) {
      elFeedWeekList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="calendar-heart"></i>
          <span>No activity logged this week yet.</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Group activities by date
    const groups = {};
    activities.forEach(act => {
      const dateCompleted = act.DateCompleted || act.datecompleted || act.dateCompleted;
      const d = new Date(dateCompleted);
      const key = formatDateISO(d);
      if (!groups[key]) groups[key] = [];
      groups[key].push(act);
    });

    // Sort dates descending
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    sortedKeys.forEach(dateKey => {
      const heading = document.createElement('h3');
      heading.className = 'feed-group-header';
      
      // If date is today, show "Today", otherwise format
      const todayISO = formatDateISO(new Date());
      if (dateKey === todayISO) {
        heading.textContent = 'Today';
      } else {
        heading.textContent = formatHumanDate(dateKey);
      }
      elFeedWeekList.appendChild(heading);

      groups[dateKey].forEach(act => {
        const logId = act.LogID || act.logid || act.logId;
        const activityText = act.ActivityText || act.activitytext || act.activityText;
        const timeCompleted = act.TimeCompleted || act.timecompleted || act.timeCompleted;

        const actEl = document.createElement('div');
        actEl.className = 'feed-item';
        
        const timeStr = formatTimeStr(timeCompleted);

        actEl.innerHTML = `
          <span class="feed-item-dot"></span>
          <div class="feed-item-details">
            <p class="feed-item-text">${activityText}</p>
            <div class="feed-item-meta">
              <span class="feed-item-time">${timeStr}</span>
              <button class="feed-delete-btn" onclick="deleteActivityLog(${logId})" title="Delete log">
                <i data-lucide="x"></i>
              </button>
            </div>
          </div>
        `;
        elFeedWeekList.appendChild(actEl);
      });
    });

    lucide.createIcons();
  } catch (err) {
    elFeedWeekList.innerHTML = `<div class="empty-state">Failed to load weekly feed.</div>`;
  }
}

async function handleLogActivitySubmit(e) {
  e.preventDefault();
  const activityText = elActivityInput.value.trim();
  if (!activityText) return;

  try {
    const res = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityText })
    });

    if (!res.ok) throw new Error("Could not log activity.");
    elActivityInput.value = '';

    await fetchActiveDates();
    renderCalendar();

    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }

    showToast("Activity logged!");
  } catch (err) {
    showToast(err.message, true);
  }
}

// Exposed globally to enable onClick actions from inline HTML
window.deleteActivityLog = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/activities/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error("Failed to delete activity log.");
    
    await fetchActiveDates();
    renderCalendar();
    
    // Refresh feeds
    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }
    
    // If selected drawer is open and matches this day, refresh it too
    if (selectedDateStr) {
      fetchHistoricalActivities(selectedDateStr);
    }

    showToast("Log entry deleted.");
  } catch (err) {
    showToast(err.message, true);
  }
};

// ============================================================================
// 📅 GROWTH CALENDAR GENERATION & HISTORICAL RETRO-ACTIVE LOGGING
// ============================================================================

async function fetchActiveDates() {
  try {
    const res = await fetch(`${API_BASE}/activities/active-dates`);
    if (res.ok) {
      activeDates = await res.json();
    }
  } catch (err) {
    console.error("Could not fetch calendar active dates:", err);
  }
}

function renderCalendar() {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  elCalendarMonthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  elCalendarDaysGrid.innerHTML = '';

  // Get first day of the month and number of days
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Empty spaces for preceding days
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty-cell';
    elCalendarDaysGrid.appendChild(emptyCell);
  }

  const today = new Date();
  const todayISO = formatDateISO(today);

  // Generate days
  for (let day = 1; day <= numDays; day++) {
    const dayCell = document.createElement('button');
    dayCell.className = 'calendar-day-cell';
    dayCell.textContent = day;

    const cellDate = new Date(currentYear, currentMonth, day);
    const cellDateStr = formatDateISO(cellDate);

    // Today highlight
    if (cellDateStr === todayISO) {
      dayCell.classList.add('today');
    }

    // Active day highlights (has activities logged)
    if (activeDates.includes(cellDateStr)) {
      dayCell.classList.add('active-day');
    }

    // Currently selected date highlight
    if (selectedDateStr === cellDateStr) {
      dayCell.classList.add('selected-day');
    }

    // Click handler to open detailed log card for that day
    dayCell.addEventListener('click', () => {
      selectCalendarDate(cellDateStr);
    });

    elCalendarDaysGrid.appendChild(dayCell);
  }
}

// Select a calendar date
function selectCalendarDate(dateStr) {
  selectedDateStr = dateStr;
  
  // Update UI selection
  renderCalendar();

  // Update date details drawer
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const d = new Date(dateStr);
  elSelectedDateTitle.textContent = `Activities on ${d.toLocaleDateString('en-US', options)}`;
  
  // Show drawer
  elDateDetailsCard.classList.remove('hidden');
  
  // Fetch activities for clicked date
  fetchHistoricalActivities(dateStr);
}

async function fetchHistoricalActivities(dateStr) {
  try {
    const res = await fetch(`${API_BASE}/activities/by-date?date=${dateStr}`);
    if (!res.ok) throw new Error("Could not retrieve historical activities.");
    const activities = await res.json();

    elSelectedDateList.innerHTML = '';
    
    if (activities.length === 0) {
      elSelectedDateList.innerHTML = `
        <div class="empty-state" style="padding: 1rem 0;">
          <i data-lucide="cloud-off" style="width: 20px; height: 20px;"></i>
          <span style="font-size: 0.75rem;">No activities logged for this day.</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    activities.forEach(act => {
      const logId = act.LogID || act.logid || act.logId;
      const activityText = act.ActivityText || act.activitytext || act.activityText;
      const timeCompleted = act.TimeCompleted || act.timecompleted || act.timeCompleted;

      const item = document.createElement('div');
      item.className = 'retro-item';
      
      const timeStr = formatTimeStr(timeCompleted);
      
      item.innerHTML = `
        <span class="retro-text" style="word-break: break-word; flex-grow: 1; text-align: left; margin-right: 0.5rem;">${activityText}</span>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
          <span style="font-size: 0.65rem; color: var(--text-muted);">${timeStr}</span>
          <button class="feed-delete-btn" onclick="deleteActivityLog(${logId})" style="display: inline-block; cursor: pointer;">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      elSelectedDateList.appendChild(item);
    });
    
    lucide.createIcons();
  } catch (err) {
    elSelectedDateList.innerHTML = `<div class="empty-state">Failed to load logs.</div>`;
  }
}

// Add a retroactive activity
async function handleRetroActivitySubmit(e) {
  e.preventDefault();
  const activityText = elRetroActivityInput.value.trim();
  if (!activityText || !selectedDateStr) return;

  try {
    const res = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityText, date: selectedDateStr })
    });

    if (!res.ok) throw new Error("Could not log retroactive activity.");
    elRetroActivityInput.value = '';

    await fetchActiveDates();
    renderCalendar();
    await fetchHistoricalActivities(selectedDateStr);

    // Refresh today/weekly feed just in case
    if (activeTab === 'today') {
      fetchTodayActivities();
    } else {
      fetchWeeklyActivities();
    }

    showToast("Historical activity added!");
  } catch (err) {
    showToast(err.message, true);
  }
}

// Apply background image style
function applyBackground(index) {
  document.body.style.backgroundImage = `url('${BACKGROUNDS[index]}')`;
}

// Fetch and render First-Time experiences
async function fetchFirstTimes() {
  try {
    const res = await fetch(`${API_BASE}/first-times`);
    if (!res.ok) throw new Error("Could not fetch first-time experiences.");
    const items = await res.json();
    
    elFirstTimesList.innerHTML = '';
    elFirstTimesCountBadge.textContent = `${items.length} logged`;

    if (items.length === 0) {
      elFirstTimesList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="sparkles" style="width: 24px; height: 24px; margin-bottom: 0.5rem; color: var(--color-peach);"></i>
          <span>No milestones logged yet. Make today a day of firsts!</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    items.forEach(item => {
      const ftId = item.ExperienceID || item.experienceid || item.experienceId;
      const desc = item.Description || item.description;
      const dateLogged = item.DateLogged || item.datelogged || item.dateLogged;

      const itemEl = document.createElement('div');
      itemEl.className = 'first-times-item';

      const formattedDate = formatHumanDate(dateLogged);

      itemEl.innerHTML = `
        <div class="first-times-item-left">
          <i data-lucide="star" style="color: var(--color-peach); fill: var(--color-peach); width: 16px; height: 16px; flex-shrink: 0;"></i>
          <div class="first-times-item-details">
            <span class="first-times-item-text">${desc}</span>
            <span class="first-times-item-date">${formattedDate}</span>
          </div>
        </div>
        <button class="first-times-delete-btn" aria-label="Delete milestone">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      `;

      // Delete click
      itemEl.querySelector('.first-times-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFirstTime(ftId);
      });

      elFirstTimesList.appendChild(itemEl);
    });

    lucide.createIcons();
  } catch (err) {
    elFirstTimesList.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i>Failed to load milestones.</div>`;
    lucide.createIcons();
  }
}

// Add First-Time experience
async function handleAddFirstTime(e) {
  e.preventDefault();
  const description = elFirstTimeInput.value.trim();
  if (!description) return;

  try {
    const res = await fetch(`${API_BASE}/first-times`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });

    if (!res.ok) throw new Error("Could not add milestone.");
    elFirstTimeInput.value = '';
    
    await fetchFirstTimes();
    showToast(`Logged milestone: ${description}`);
  } catch (err) {
    showToast(err.message, true);
  }
}

// Delete First-Time experience
async function deleteFirstTime(id) {
  try {
    const res = await fetch(`${API_BASE}/first-times/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error("Could not delete milestone.");
    await fetchFirstTimes();
    showToast("Milestone deleted.");
  } catch (err) {
    showToast(err.message, true);
  }
}

// Render the dreams board cards
function renderDreams() {
  if (!elDreamsGrid) return;
  elDreamsGrid.innerHTML = '';

  DREAMS.forEach((dream, index) => {
    const isAchieved = achievedDreams.includes(dream.id);
    const isActiveBg = currentBgIndex === index;

    const card = document.createElement('div');
    card.className = `dream-card ${isAchieved ? 'achieved' : ''} ${isActiveBg ? 'active-bg' : ''}`;
    card.style.backgroundImage = `url('${dream.image}')`;
    
    card.innerHTML = `
      <div class="dream-card-overlay">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <input type="checkbox" class="dream-card-checkbox" ${isAchieved ? 'checked' : ''} title="Mark as achieved">
          ${isAchieved ? '<span class="dream-badge-achieved"><i data-lucide="check" style="width: 8px; height: 8px;"></i> Done</span>' : ''}
        </div>
        <div class="dream-card-title">${dream.title}</div>
      </div>
    `;

    // Click on checkbox to toggle achieved state
    const checkbox = card.querySelector('.dream-card-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDreamAchieved(dream.id, checkbox.checked);
    });

    // Click on card to set background
    card.addEventListener('click', () => {
      currentBgIndex = index;
      localStorage.setItem('scheduleRightBgIndex', currentBgIndex);
      applyBackground(currentBgIndex);
      renderDreams();
      showToast(`Theme changed to: ${dream.title}`);
    });

    elDreamsGrid.appendChild(card);
  });

  lucide.createIcons();
}

// Toggle achieved state
function toggleDreamAchieved(id, checked) {
  if (checked) {
    if (!achievedDreams.includes(id)) {
      achievedDreams.push(id);
    }
    showToast(`Dream marked as achieved! Keep pushing! 🌟`);
  } else {
    achievedDreams = achievedDreams.filter(d => d !== id);
  }
  localStorage.setItem('scheduleRightAchievedDreams', JSON.stringify(achievedDreams));
  renderDreams();
}

// ============================================================================
// 🔄 INITIALIZATION & EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Quote Controls
  elNewQuoteBtn.addEventListener('click', () => fetchRandomQuote(false));
  elSecretQuoteBtn.addEventListener('click', () => fetchRandomQuote(true));
  
  // Custom Quote Accordion Toggle
  elAddQuoteTrigger.addEventListener('click', () => {
    const isHidden = elAddQuoteForm.classList.toggle('hidden');
    elAddQuoteArrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });
  elAddQuoteForm.addEventListener('submit', handleAddQuoteSubmit);

  // Calendar Controls
  elPrevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  elNextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  elCloseDetailsBtn.addEventListener('click', () => {
    elDateDetailsCard.classList.add('hidden');
    selectedDateStr = null;
    renderCalendar();
  });
  elRetroActivityForm.addEventListener('submit', handleRetroActivitySubmit);
  
  // Background cycler control
  const elChangeBgBtn = document.getElementById('change-bg-btn');
  if (elChangeBgBtn) {
    elChangeBgBtn.addEventListener('click', () => {
      currentBgIndex = (currentBgIndex + 1) % BACKGROUNDS.length;
      localStorage.setItem('scheduleRightBgIndex', currentBgIndex);
      applyBackground(currentBgIndex);
      renderDreams();
      showToast("Theme changed to next dream!");
    });
  }

  // First-Times Notepad Controls
  if (elFirstTimesForm) {
    elFirstTimesForm.addEventListener('submit', handleAddFirstTime);
  }

  // Todo Form Controls
  elTodoForm.addEventListener('submit', handleAddTodo);

  // Activity Log Controls
  elLogActivityForm.addEventListener('submit', handleLogActivitySubmit);

  // Activity Tabs Controls
  elTabTodayBtn.addEventListener('click', () => {
    elTabTodayBtn.classList.add('active');
    elTabWeekBtn.classList.remove('active');
    document.getElementById('feed-today').classList.add('active-feed');
    document.getElementById('feed-week').classList.remove('active-feed');
    activeTab = 'today';
    fetchTodayActivities();
  });

  elTabWeekBtn.addEventListener('click', () => {
    elTabWeekBtn.classList.add('active');
    elTabTodayBtn.classList.remove('active');
    document.getElementById('feed-week').classList.add('active-feed');
    document.getElementById('feed-today').classList.remove('active-feed');
    activeTab = 'week';
    fetchWeeklyActivities();
  });
}

// App Kickoff
async function init() {
  setupHeaderDates();
  setupEventListeners();
  
  // Initialize background
  const savedBgIndex = localStorage.getItem('scheduleRightBgIndex');
  if (savedBgIndex !== null) {
    const parsed = parseInt(savedBgIndex, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < BACKGROUNDS.length) {
      currentBgIndex = parsed;
    }
  }
  applyBackground(currentBgIndex);
  
  // Pull initial dynamic components
  await fetchRandomQuote(false);
  await fetchChecklist();
  await fetchTodos();
  await fetchFirstTimes();
  renderDreams();
  await fetchActiveDates();
  renderCalendar();
  
  // Feed loads
  fetchTodayActivities();
}

// Boot the app
window.addEventListener('DOMContentLoaded', init);
