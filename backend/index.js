/* eslint-disable no-console */
// импорт стандартных библиотек Node.js
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { createServer } = require('http');

// файл для базы данных
const DB_FILE = process.env.DB_FILE || './db.json';
// номер порта, на котором будет запущен сервер
const PORT = process.env.PORT || 3000;
// префикс URI для всех методов приложения
const URI_PREFIX = '/api/students';

/**
 * Класс ошибки, используется для отправки ответа с определённым кодом и описанием ошибки
 */
class ApiError extends Error {
    constructor(statusCode, data) {
        super();
        this.statusCode = statusCode;
        this.data = data;
    }
}

/**
 * Асинхронно считывает тело запроса и разбирает его как JSON
 * @param {Object} req - Объект HTTP запроса
 * @throws {ApiError} Некорректные данные в аргументе
 * @returns {Object} Объект, созданный из тела запроса
 */
function drainJson(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            resolve(JSON.parse(data));
        });
    });
}

/**
 * Проверяет входные данные и создаёт из них корректный объект студента
 * @param {Object} data - Объект с входными данными
 * @throws {ApiError} Некорректные данные в аргументе (statusCode 422)
 * @returns {{ name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string }} Объект студента
 */
function makeStudentFromData(data) {
    const errors = [];

    function asString(v) {
        return v && String(v).trim() || '';
    }

    // составляем объект, где есть только необходимые поля
    const student = {
        name: asString(data.name),
        surname: asString(data.surname),
        lastname: asString(data.lastname),
        birthday: asString(data.birthday),
        studyStart: asString(data.studyStart),
        faculty: asString(data.faculty),
    }

    // проверяем, все ли данные корректные и заполняем объект ошибок, которые нужно отдать клиенту
    if (!student.name) errors.push({ field: 'name', message: 'Не указано имя' });
    if (!student.surname) errors.push({ field: 'surname', message: 'Не указана фамилия' });
    if (!student.lastname) errors.push({ field: 'lastname', message: 'Не указано отчество' });

    if (!student.birthday) errors.push({ field: 'birthday', message: 'Не указана дата рождения' });
    if (!student.studyStart) errors.push({ field: 'studyStart', message: 'Не указано начало обучения' });
    if (!student.faculty) errors.push({ field: 'faculty', message: 'Не указан факультет' });

    // если есть ошибки, то бросаем объект ошибки с их списком и 422 статусом
    if (errors.length) throw new ApiError(422, { errors });

    return student;
}

/**
 * Возвращает список студентов из базы данных
 * @param {{ search: string }} [params] - Поисковая строка
 * @returns {{ id: string, name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string }[]} Массив студентов
 */
function getStudentList(params = {}) {
    const students = JSON.parse(readFileSync(DB_FILE) || '[]');
    if (params.search) {
        const search = params.search.trim().toLowerCase();
        return students.filter(student => [
                student.name,
                student.surname,
                student.lastname,
                student.birthday,
                student.studyStart,
                student.faculty,
            ]
            .some(str => str.toLowerCase().includes(search))
        );
    }
    return students;
}

/**
 * Создаёт и сохраняет студента в базу данных
 * @throws {ApiError} Некорректные данные в аргументе, студент не создан (statusCode 422)
 * @param {Object} data - Данные из тела запроса
 * @returns {{ id: string, name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string, createdAt: string, updatedAt: string }} Объект студента
 */
function createStudent(data) {
    const newItem = makeStudentFromData(data);
    newItem.id = Date.now().toString();
    newItem.createdAt = newItem.updatedAt = new Date().toISOString();
    writeFileSync(DB_FILE, JSON.stringify([...getStudentList(), newItem]), { encoding: 'utf8' });
    return newItem;
}

/**
 * Возвращает объект студента по его ID
 * @param {string} itemId - ID студента
 * @throws {ApiError} Студент с таким ID не найден (statusCode 404)
 * @returns {{ id: string, name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string, createdAt: string, updatedAt: string }} Объект студента
 */
function getStudent(itemId) {
    const student = getStudentList().find(({ id }) => id === itemId);
    if (!student) throw new ApiError(404, { message: 'Student Not Found' });
    return student;
}

/**
 * Изменяет студента с указанным ID и сохраняет изменения в базу данных
 * @param {string} itemId - ID изменяемого студента
 * @param {{ name?: string, surname?: string, lastname?: string, birthday?: string, studyStart?: string, faculty?: string }} data - Объект с изменяемыми данными
 * @throws {ApiError} Студент с таким ID не найден (statusCode 404)
 * @throws {ApiError} Некорректные данные в аргументе (statusCode 422)
 * @returns {{ id: string, name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string, createdAt: string, updatedAt: string }} Объект студента
 */
function updateStudent(itemId, data) {
    const students = getStudentList();
    const itemIndex = students.findIndex(({ id }) => id === itemId);
    if (itemIndex === -1) throw new ApiError(404, { message: 'Student Not Found' });
    Object.assign(students[itemIndex], makeStudentFromData({...students[itemIndex], ...data }));
    students[itemIndex].updatedAt = new Date().toISOString();
    writeFileSync(DB_FILE, JSON.stringify(students), { encoding: 'utf8' });
    return students[itemIndex];
}

/**
 * Удаляет студента из базы данных
 * @param {string} itemId - ID студента
 * @returns {{}}
 */
function deleteStudent(itemId) {
    const students = getStudentList();
    const itemIndex = students.findIndex(({ id }) => id === itemId);
    if (itemIndex === -1) throw new ApiError(404, { message: 'Student Not Found' });
    students.splice(itemIndex, 1);
    writeFileSync(DB_FILE, JSON.stringify(students), { encoding: 'utf8' });
    return {};
}

// создаём новый файл с базой данных, если он не существует
if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, '[]', { encoding: 'utf8' });

// создаём HTTP сервер, переданная функция будет реагировать на все запросы к нему
module.exports = createServer(async(req, res) => {
        // req - объект с информацией о запросе, res - объект для управления отправляемым ответом

        // этот заголовок ответа указывает, что тело ответа будет в JSON формате
        res.setHeader('Content-Type', 'application/json');

        // CORS заголовки ответа для поддержки кросс-доменных запросов из браузера
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // запрос с методом OPTIONS может отправлять браузер автоматически для проверки CORS заголовков
        // в этом случае достаточно ответить с пустым телом и этими заголовками
        if (req.method === 'OPTIONS') {
            // end = закончить формировать ответ и отправить его клиенту
            res.end();
            return;
        }

        // если URI не начинается с нужного префикса - можем сразу отдать 404
        if (!req.url || !req.url.startsWith(URI_PREFIX)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'Not Found' }));
            return;
        }

        // убираем из запроса префикс URI, разбиваем его на путь и параметры
        const [uri, query] = req.url.substr(URI_PREFIX.length).split('?');
        const queryParams = {};

        // параметры могут отсутствовать вообще или иметь вид a=b&b=c
        // во втором случае наполняем объект queryParams { a: 'b', b: 'c' }
        if (query) {
            for (const piece of query.split('&')) {
                const [key, value] = piece.split('=');
                queryParams[key] = value ? decodeURIComponent(value) : '';
            }
        }

        try {
            // обрабатываем запрос и формируем тело ответа
            const body = await (async() => {
                if (uri === '' || uri === '/') {
                    // /api/students
                    if (req.method === 'GET') return getStudentList(queryParams);
                    if (req.method === 'POST') {
                        const createdItem = createStudent(await drainJson(req));
                        res.statusCode = 201;
                        res.setHeader('Access-Control-Expose-Headers', 'Location');
                        res.setHeader('Location', `${URI_PREFIX}/${createdItem.id}`);
                        return createdItem;
                    }
                } else {
                    // /api/students/{id}
                    // параметр {id} из URI запроса
                    const itemId = uri.substr(1);
                    if (req.method === 'GET') return getStudent(itemId);
                    if (req.method === 'PATCH') return updateStudent(itemId, await drainJson(req));
                    if (req.method === 'DELETE') return deleteStudent(itemId);
                }
                return null;
            })();
            res.end(JSON.stringify(body));
        } catch (err) {
            // обрабатываем сгенерированную нами же ошибку
            if (err instanceof ApiError) {
                res.writeHead(err.statusCode);
                res.end(JSON.stringify(err.data));
            } else {
                // если что-то пошло не так - пишем об этом в консоль и возвращаем 500 ошибку сервера
                res.statusCode = 500;
                res.end(JSON.stringify({ message: 'Server Error' }));
                console.error(err);
            }
        }
    })
    // выводим инструкцию, как только сервер запустился...
    .on('listening', () => {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`Сервер Students запущен. Вы можете использовать его по адресу http://localhost:${PORT}`);
            console.log('Нажмите CTRL+C, чтобы остановить сервер');
            console.log('Доступные методы:');
            console.log(`GET ${URI_PREFIX} - получить список студентов, в query параметр search можно передать поисковый запрос`);
            console.log(`POST ${URI_PREFIX} - создать студента, в теле запроса нужно передать объект { name: string, surname: string, lastname: string, birthday: string, studyStart: string, faculty: string}`);
            console.log(`GET ${URI_PREFIX}/{id} - получить студента по его ID`);
            console.log(`PATCH ${URI_PREFIX}/{id} - изменить студента с ID, в теле запроса нужно передать объект { name?: string, surname?: string, lastname?: string, birthday?: string, studyStart?: string, faculty?: string}`);
            console.log(`DELETE ${URI_PREFIX}/{id} - удалить студента по ID`);
        }
    })
    // ...и вызываем запуск сервера на указанном порту
    .listen(PORT);