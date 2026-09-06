<?php
/**
 * Portal Marítimo - API de Gerenciamento do Line-Up (cPanel / Apache)
 * Endpoint: /api/lineup.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$storageFile = __DIR__ . '/lineup_storage.json';

// GET: Retornar os dados persistidos no servidor
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($storageFile)) {
        $content = file_get_contents($storageFile);
        echo $content;
    } else {
        echo json_encode([
            'status' => 'empty',
            'message' => 'Nenhum dado customizado salvo ainda.'
        ]);
    }
    exit;
}

// POST: Salvar novos dados enviados pelo Admin
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON inválido']);
        exit;
    }

    // Validação de credenciais
    $user = isset($data['user']) ? trim($data['user']) : '';
    $pass = isset($data['pass']) ? $data['pass'] : '';

    if ($user !== 'controle' || $pass !== 'casa8877$') {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciais administrativas inválidas']);
        exit;
    }

    $pdfDate = '';
    if (isset($data['pdf']) && is_array($data['pdf'])) {
        if (!empty($data['pdf']['pdfDate'])) {
            $pdfDate = trim($data['pdf']['pdfDate']);
        } elseif (!empty($data['pdf']['uploadedAt'])) {
            $pdfDate = trim($data['pdf']['uploadedAt']);
        }
    }

    $lastUpdated = !empty($pdfDate) 
        ? $pdfDate 
        : (!empty($data['lastUpdated']) ? trim($data['lastUpdated']) : date('d/m/Y H:i'));

    $payloadToSave = [
        'vessels' => isset($data['vessels']) ? $data['vessels'] : null,
        'pdf' => isset($data['pdf']) ? $data['pdf'] : null,
        'lastUpdated' => $lastUpdated,
        'updatedBy' => 'controle'
    ];

    $saved = file_put_contents($storageFile, json_encode($payloadToSave, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    if ($saved !== false) {
        echo json_encode([
            'success' => true,
            'message' => 'Dados atualizados no servidor com sucesso!',
            'lastUpdated' => $payloadToSave['lastUpdated']
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Falha ao salvar no disco do servidor. Verifique permissões da pasta api/']);
    }
    exit;
}
