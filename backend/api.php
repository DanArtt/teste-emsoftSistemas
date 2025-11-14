<?php
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['status'=>'error','message'=>'Método não permitido. Use POST.']);
    exit;
}


$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'JSON inválido.']);
    exit;
}

// Validação dos campos obrigatórios
$required = ['cep','endereco','bairro','cidade','estado','pais'];
foreach ($required as $r) {
    if (!isset($data[$r]) || trim($data[$r]) === '') {
        http_response_code(400);
        echo json_encode(['status'=>'error','message'=>"Campo '{$r}' é obrigatório."]);
        exit;
    }
}

// Validação do CEP
$cep = preg_replace('/\D/', '', $data['cep']);
if (!preg_match('/^[0-9]{8}$/', $cep)) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'CEP inválido. Deve conter 8 dígitos.']);
    exit;
}

// Preparar entrada para salvar no arquivo JSON
$entry = [
    'cep' => $cep,
    'endereco' => trim($data['endereco']),
    'bairro' => trim($data['bairro']),
    'cidade' => trim($data['cidade']),
    'estado' => strtoupper(trim($data['estado'])),
    'pais' => trim($data['pais']),
    'dataHora' => (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('c')
];


$dataFile = __DIR__ . '/../data/ceps.json';

// Garante que o arquivo json existe
$dir = dirname($dataFile);
if (!is_dir($dir)) {
    if (!mkdir($dir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['status'=>'error','message'=>'Falha ao criar diretório de dados.']);
        exit;
    }
}

$fp = fopen($dataFile, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Não foi possível abrir arquivo de dados.']);
    exit;
}

if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Não foi possível obter lock no arquivo de dados.']);
    exit;
}

$contents = stream_get_contents($fp);
$existing = [];
if ($contents !== false && strlen(trim($contents)) > 0) {
    $decoded = json_decode($contents, true);
    if (is_array($decoded)) {
        $existing = $decoded;
    } else {

        $backup = $dataFile . '.bak.' . time();
        file_put_contents($backup, $contents);
        $existing = [];
    }
}

// Verifica duplicidade do CEP
foreach ($existing as $row) {
    if (isset($row['cep']) && $row['cep'] === $cep) {

        flock($fp, LOCK_UN);
        fclose($fp);
        http_response_code(200);
        echo json_encode(['status'=>'error','message'=>'CEP já cadastrado.']);
        exit;
    }
}

$existing[] = $entry;
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

http_response_code(200);
echo json_encode(['status'=>'ok','message'=>'Endereço salvo com sucesso.']);
exit;
