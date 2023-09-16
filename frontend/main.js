const SERVER_URL = 'http://localhost:3000'

async function serverAddStudent(obj) {
  let response = await fetch(SERVER_URL + '/api/students', {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  })

  let data = await response.json()

  return data
}

async function serverPushStudent() {
  let response = await fetch(SERVER_URL + '/api/students', {
    method: "GET",
    headers: { 'Content-Type': 'application/json' }
  })

  let data = await response.json()

  return data
}

async function serverDeleteStudent(id) {
  let response = await fetch(`http://localhost:3000/api/students/${id}`, {
    method: "DELETE",
  })

  let data = await response.json()

  return data
}

let serverData = await serverPushStudent()


let studentsList = []

if (serverData) {
  studentsList = serverData
}

let sortColumnFlag = 'fio',
    sortDirFlag = true

const $list = document.getElementById('list'),
      $form = document.getElementById('form'),
      $nameInput = document.getElementById('add-name'),
      $surnameInput = document.getElementById('add-surname'),
      $lastnameInput = document.getElementById('add-lastname'),
      $birthInput = document.getElementById('add-birth'),
      $startyearInput = document.getElementById('add-startyear'),
      $facultyInput = document.getElementById('add-faculty'),

      $filterForm = document.getElementById('filter-form'),
      $filterName = document.getElementById('filter-name'),
      $filterFaculty = document.getElementById('filter-faculty'),
      $filterEnd = document.getElementById('filter-end'),
      $filterStart = document.getElementById('filter-start'),

      $table = document.createElement('table'),
      $thead = document.createElement('thead'),
      $tbody = document.createElement('tbody'),
      $tableHeadTR = document.createElement('tr'),
      $tableHeadFIO = document.createElement('th'),
      $tableHeadAge = document.createElement('th'),
      $tableHeadStart = document.createElement('th'),
      $tableHeadFaculty = document.createElement('th');

$tableHeadFIO.textContent = 'Фамилия, Имя, Отчетство';
$tableHeadAge.textContent = 'Дата рождения (возраст)';
$tableHeadStart.textContent = 'Годы обучения и номер курса';
$tableHeadFaculty.textContent = 'Факультет';

$table.classList.add('table', 'table-success', 'table-striped')

$tableHeadTR.append($tableHeadFIO)
$tableHeadTR.append($tableHeadAge)
$tableHeadTR.append($tableHeadStart)
$tableHeadTR.append($tableHeadFaculty)

$thead.append($tableHeadTR)
$table.append($thead)
$table.append($tbody)
$list.append($table)

//validate
function validation (form) {

  function removeError(input) {
    const parent = input.parentNode;
    if(parent.classList.contains('is-invalid')) {
      parent.querySelector('.form-label').remove()
      parent.classList.remove('is-invalid')
      input.classList.remove('is-invalid')
    }
  }

  function createError(input, text) {
    const parent = input.parentNode;
    const errorLabel = document.createElement('label')
    errorLabel.classList.add('form-label')
    input.classList.add('is-invalid')
    errorLabel.textContent = text
    parent.classList.add('is-invalid')

    parent.append(errorLabel)
  }

  let result = true

  const allInputs = form.querySelectorAll('input');

  for (const input of allInputs) {
    removeError(input)

    if(input.dataset.minLength) {

      if(input.value.length < input.dataset.minLength) {
        removeError(input)
        createError(input, 'Введено недостаточное количество символов')
        result = false
      }
    }


    if(input.dataset.maxLength) {

      if(input.value.length > input.dataset.maxLength) {
        removeError(input)
        createError(input, 'Превышена максимальная длина символов')
        result = false
      }
    }

    if(input.dataset.required == 'true') {
      if(input.value == '') {
        removeError(input)
        createError(input, 'Поле не заполнено')
        result = false
      }
    }
    }

    return result
}

function render(arrData) {
  $tbody.innerHTML = ''
  let copyStudentsList = [... arrData]

//подготовка
for (const oneStudent of copyStudentsList) {
  oneStudent.fio = oneStudent.name + ' ' + oneStudent.lastname + ' ' + oneStudent.surname
  // oneStudent.age = oneStudent.birthday
  // oneStudent.age = Date.parse(oneStudent.birthday).toLocaleDateString('ru-RU') + ', ' + '(' + (2023 - Date.parse(oneStudent.birthday.getFullYear())) + ' лет)'

  oneStudent.age =  (new Date(oneStudent.birthday)).toLocaleDateString('ru-RU') + ', ' + '(' + (2023 - (new Date(oneStudent.birthday).getFullYear())) + ' лет)'

  function yyStudying(oneStudent) {
    if ((Number(oneStudent.studyStart) + 4) > 2023) {
      return oneStudent.studyYears = Number(oneStudent.studyStart) + ' - ' + (Number(oneStudent.studyStart) + 4) + ' (' + (2023 - Number(oneStudent.studyStart)) + ' курс)';
    } else {
      return oneStudent.studyYears = 'Обучение закончено';
    }
  }
  yyStudying(oneStudent)
}

//сортировка
copyStudentsList = copyStudentsList.sort(function(a,b) {
  let sort = a[sortColumnFlag] < b[sortColumnFlag]
  if (sortDirFlag == false) sort =   a[sortColumnFlag] > b[sortColumnFlag]
  if (sort) return -1
})

//фильтрация
if ($filterName.value.trim() !== '') {
  copyStudentsList = filterArray(copyStudentsList, 'fio', $filterName.value)
}

if ($filterFaculty.value.trim() !== '') {
  copyStudentsList = filterArray(copyStudentsList, 'faculty', $filterFaculty.value)
}

if ($filterStart.value.trim() !== '') {
  copyStudentsList = copyStudentsList.filter(function(oneStudent) {
    if(oneStudent.studyYears.substr(0, 4).includes($filterStart.value.trim())) return true
  })}

if ($filterEnd.value.trim() !== '') {
  copyStudentsList = copyStudentsList.filter(function(oneStudent) {
    if(oneStudent.studyYears.substr(7, 4).includes($filterEnd.value.trim())) return true
  })
}

//отрисовка
for (const oneStudent of copyStudentsList) {
  const $studentTR = document.createElement('tr'),
      $studentFIO = document.createElement('th'),
      $studentAge = document.createElement('th'),
      $studentStart = document.createElement('th'),
      $studentFaculty = document.createElement('th'),


      $tdDelete = document.createElement('td'),
      $btnDelete = document.createElement('button');
      $btnDelete.classList.add('btn', 'btn-danger')
      $btnDelete.textContent = 'Удалить'

  $studentFIO.textContent = oneStudent.fio;
  $studentAge.textContent = oneStudent.age;
  $studentStart.textContent = oneStudent.studyYears;
  $studentFaculty.textContent = oneStudent.faculty;

  $btnDelete.addEventListener('click', async function () {
    await serverDeleteStudent(oneStudent.id)
    $studentTR.remove()

  })

  $tdDelete.append($btnDelete)

  $studentTR.append($studentFIO)
  $studentTR.append($studentAge)
  $studentTR.append($studentStart)
  $studentTR.append($studentFaculty)
  $studentTR.append($tdDelete)

  $tbody.append($studentTR)
}
}

render(studentsList)
//Form

$form.addEventListener('submit', async function(e) {
  e.preventDefault();

  if(validation(this) == true) {
    alert('Данные введены верно')
  } else {
    return
  }

  let newStudentObj = {
    name: $nameInput.value,
    lastname: $lastnameInput.value,
    surname: $surnameInput.value,
    birthday: $birthInput.valueAsDate,
    studyStart: $startyearInput.valueAsNumber,
    faculty: $facultyInput.value
  }

  let serverDataObj = await serverAddStudent(newStudentObj);

  serverDataObj.birthday = new Date (serverDataObj.birthday)
  serverDataObj.studyStart = Number(serverDataObj.studyStart)

  studentsList.push(serverDataObj)
  console.log(studentsList);
  render(studentsList)


})

// сортировка массива студентов

$tableHeadFIO.addEventListener('click', function() {
  sortColumnFlag = 'fio'
  sortDirFlag = !sortDirFlag
  render(studentsList)
})

$tableHeadAge.addEventListener('click', function() {
  sortColumnFlag = 'age'
  sortDirFlag = !sortDirFlag
  render(studentsList)
})

$tableHeadStart.addEventListener('click', function() {
  sortColumnFlag = 'studyYears'
  sortDirFlag = !sortDirFlag
  render(studentsList)
})

$tableHeadFaculty.addEventListener('click', function() {
  sortColumnFlag = 'faculty'
  sortDirFlag = !sortDirFlag
  render(studentsList)
})

// фильтрация массива студентов

function filterArray(arr, prop, value) {
  return arr.filter(function(oneStudent) {
    if(oneStudent[prop].includes(value.trim())) return true
  })
}

$filterForm.addEventListener('submit', function(e) {
  e.preventDefault();
})

$filterName.addEventListener('input', function() {
  render(studentsList)
})

$filterFaculty.addEventListener('input', function() {
  render(studentsList)
  })

$filterEnd.addEventListener('input', function() {
  render(studentsList)
  })

$filterStart.addEventListener('input', function() {
  render(studentsList)
  })
