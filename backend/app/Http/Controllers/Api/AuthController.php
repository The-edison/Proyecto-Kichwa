<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'cedula' => ['nullable', 'digits:10', 'unique:users,cedula'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $data['role_id'] = Role::where('code', 'student')->firstOrFail()->id;
        $user = User::create($data);

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            return response()->json(['user' => $user->load('role:id,code,name')], 201);
        }

        return response()->json([
            'user' => $user->load('role:id,code,name'),
            'token' => $user->createToken('student-api', ['*'], now()->addDays(7))->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['nullable', 'string', 'max:255'],
            'cedula' => ['nullable', 'digits:10'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($data['identifier'] ?? $data['cedula'] ?? '');
        $errorField = isset($data['identifier']) ? 'identifier' : 'cedula';
        if ($identifier === '') {
            throw ValidationException::withMessages([$errorField => 'Ingresa un correo o una cédula.']);
        }
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'cedula';
        if ($field === 'cedula' && ! preg_match('/^[0-9]{10}$/', $identifier)) {
            throw ValidationException::withMessages([$errorField => 'Ingresa un correo o una cédula válida.']);
        }

        $user = User::with('role:id,code,name')->where($field, $identifier)->first();
        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([$errorField => 'Credenciales incorrectas.']);
        }

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            return response()->json(['user' => $user]);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api', ['*'], now()->addDays(7))->plainTextToken,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('role:id,code,name'));
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(null, 204);
    }
}
