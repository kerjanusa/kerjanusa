<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(private MessageService $messageService)
    {
    }

    public function threads(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->messageService->listThreads($request->user()),
        ]);
    }

    public function contacts(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->messageService->getAvailableContacts(
                $request->user(),
                $request->query('search')
            ),
        ]);
    }

    public function conversation(Request $request, int $userId): JsonResponse
    {
        $counterpart = User::find($userId);

        if (!$counterpart) {
            return response()->json([
                'message' => 'Kontak tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'data' => $this->messageService->getConversation($request->user(), $counterpart),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_id' => 'required|integer|exists:users,id',
            'body' => 'required|string|max:5000',
            'job_id' => 'nullable|integer|exists:jobs,id',
        ]);

        $message = $this->messageService->sendMessage($request->user(), $validated);

        return response()->json([
            'message' => 'Pesan berhasil dikirim.',
            'data' => $this->messageService->presentMessage($message, $request->user()),
        ], 201);
    }
}
