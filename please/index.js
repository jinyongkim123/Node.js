/*






깃 허브 주소 : https://github.com/jinyongkim123/Node.js






*/

const express = require('express');     // Express 웹 프레임워크를 사용하기 위한 모듈
const app = express();             
const path = require('path');           //파일 및 디렉토리 경로를 조작하기 위한 모듈
const multer = require('multer');       //파일 업로드를 처리하기 위한 모듈
const mysql = require('mysql2');        //MySQL 데이터베이스에 연결하기 위한 모듈
const fs = require('fs');               //파일 시스템에 접근하기 위한 모듈
const nunjucks = require('nunjucks');   //템플릿 엔진인 Nunjucks를 사용하기 위한 모듈


//Nunjucks 설정: Nunjucks를 'chart' 디렉토리에서 템플릿을 로드하도록 설정하고,
//자동 이스케이프 기능을 사용하며, Express 애플리케이션('app')과 연결
nunjucks.configure('chart', {
    autoescape: true,
    express: app
});

//MySQL 연결 설정: MySQL 데이터베이스에 연결하기 위한 설정 수행
//'createConnection'메서드에 호스트, 사용자 이름, 비밀번호, 데이터베이스 이름 등을 전달하여 연결을 설정
const connection = mysql.createConnection(
    {host: 'localhost', user: 'root', password: '', database: 'my_db'}
);

//uploads 폴더 생성: 'uploads'폴더가 없을 경우, 해당 폴더를 생성.
//fs 모듈의 readdirSync 함수를 사용하여 폴더의 존재 여부를 확인하고
//mkdirSync 함수를 사용하여 폴더 생성
try {
    fs.readdirSync('uploads');
} catch (error) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
}

// 파일 업로드를위한 multer 설정: destination 함수에서 업로드 될 파일이 저장될 경로를 지정하고
//filename 함수에서 파일의 이름을 설정한다.
//multer 함수를 호출하여 설정 적용
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    }
});
const upload = multer({storage: storage});

//db에서 값꺼낸거 정리 하고 담을 배열선언
//5x5의 2차원 배열로 선언되고, 초기값으로 빈 배열('[]')을 가지도록 설정
const coretask_value = Array.from({
    length: 5
}, () => Array.from({
    length: 5
}, () => [])); //task별로 정렬시키기 : taskN에 속한 coreN의 값의 집합

//꺼낸 값들 계산 하고 담을 배열 선언
//5x5의 2차원 배열로 선언되고, 초기값으로 빈 배열('[]')을 가지도록 설정
const coretask_result = Array.from({
    length: 5
}, () => Array.from({
    length: 5
}, () => [])); //task별, core별로 최대, 최소, 평균, 표준편차, 중앙값 계산

// 업로드 페이지를 렌더링하는 라우터
// '/' 경로로 GET 요청이 들어오면 'uploads.html'파일을 응답으로 전송
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload.html'));
});

// 서버 시작
app.listen(3000, () => {
    console.log('서버가 시작되었습니다.');
});

//서버 종료와 함께 MySQL 연결 끊고 프로세스 종료
process.on('SIGINT', () => {
    console.log('서버가 종료됩니다.');
    connection.end();
    process.exit();
});

// 업로드된 파일을 처리하는 라우터 파일로 들어온 데이터 가공하고 DB에 저장
// '/upload' 경로로 POST 요청이 들어오면 파일 업로드 처리와 데이터 베이스 작업을 수행하는 코드가 실행
// 업로드된 파일을 읽고 데이터를 추출하여 데이터베이스에 삽입 후, 필요한 계산 수행하여
// 'coretask_value'와 'coretask_result'배열에 값을 저장
app.post('/upload', upload.single('userfile'), (req, res) => {
    // 새로운 파일을 위해 기존 기록 제거
    connection.query('DELETE FROM table_name');

    // 파일이 위치한 디렉토리 경로
    const directoryPath = 'uploads/';

    // 파일 이름 목록 읽기
    const files = fs.readdirSync(directoryPath);
    const fileName = files[0];

    const fileContent = fs.readFileSync(directoryPath + fileName, 'utf-8');

    // 숫자 값만 받아오는 코드
    const frows = fileContent.match(/\d+/g);

    // core1 <-에 붙은 숫자 제거
    const rows = frows.filter(
        (value) => !['1', '2', '3', '4', '5'].includes(value)
    );

    // rows를 2차원 배열로 변환
    const numColumns = 5;
    const data = [];
    for (let i = 0; i < rows.length; i += numColumns) {
        const row = rows.slice(i, i + numColumns);
        data.push(row);
    }

    //사용한 파일 다시 제거
    fs.unlink(directoryPath + fileName, (err) => {
        if (err) 
            throw err;
        console.log('File is deleted.');
    });

    // 삽입 쿼리 생성
    connection.query(
        'INSERT INTO table_name (task1, task2, task3, task4, task5) VALUES ?',
        [data],
        (err) => {
            if (err) 
                throw err;
            console.log(`Inserted ${data.length} rows.`);
        }
    );

    // 데이터베이스에서 데이터 가져오기
    connection.query(
        'SELECT task1, task2, task3, task4, task5 FROM table_name',
        (error, results, fields) => {
            if (error) 
                throw error;
            
            // 데이터를 저장할 이차원 배열
            const data = [];

            // 결과를 배열에 저장
            for (let i = 0; i < results.length; i++) {
                const row = results[i];
                const rowData = [row.task1, row.task2, row.task3, row.task4, row.task5];
                data.push(rowData);
            }

            // 이차원 배열인 data를 일차원 배열로 복사
            const newdata = data.flat();

            // 각 task마다 core1~5까지의 값 묶어서 넣기 이 부분 너무
            // 어려움!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            for (let j = 0; j < 10; j++) {
                const realnew_data = newdata.slice(j * 25, j * 25 + 25);
                for (let i = 0; i < 25; i++) {
                    const coreIndex = parseInt(i / 5);
                    const valueIndex = i % 5;
                    coretask_value[coreIndex][valueIndex].push(realnew_data[i]);
                }
            }

            // coretask_result 값 넣기
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    const values = coretask_value[i][j];
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    const average = avg(values);
                    const stdDeviation = standardDeviation(values);
                    const medianValue = median(values);
                    coretask_result[i][j].push(max, min, average, stdDeviation, medianValue);
                }
            }

            // 평균 계산 함수
            function avg(arr) {
                const sum = arr.reduce((total, num) => total + parseInt(num), 0);
                return Math.floor(sum / arr.length);
            }

            // 표준 편차 계산 함수
            function standardDeviation(arr) {
                const mean = avg(arr);
                const squaredDiffs = arr.map((num) => (parseInt(num) - mean) ** 2);//기존 배열에서 각 값에서 평균 값 빼고 제곱
                const variance = squaredDiffs.reduce((total, num) => total + num, 0) / (//squaredDiffs 배열의 요소 합산 후 배열의 길이에서 1을 뺀 값으로 나눈 결과인 분산 값을 variance 변수에 할당
                    arr.length - 1
                );
                return Math.floor(Math.sqrt(variance));
            }

            // 중앙값 계산 함수
            function median(arr) {
                const sortedArr = arr.map((num) => parseInt(num)).sort((a, b) => a - b);
                const midIndex = Math.floor(sortedArr.length / 2);
                return sortedArr[midIndex];
            }

            console.log(coretask_value);// taskN에 속한 coreN의 값의 집합 출력
            console.log(coretask_result);//task별, core별로 최대, 최소, 평균, 표준편차, 중앙값 계산한 배열 출력

            res.render('main.html', {coretask_result});
        }
    );
});

