<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'cedula' => ['nullable', 'digits:10', 'unique:users,cedula'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $data['role_id'] = Role::where('code', 'student')->firstOrFail()->id;
        $user = User::create($data);
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect()->route('student.dashboard');
    }

    public function login(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($data['identifier']);
        $field = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'cedula';
        if ($field === 'cedula' && ! preg_match('/^[0-9]{10}$/', $identifier)) {
            throw ValidationException::withMessages(['identifier' => 'Ingresa un correo o una cédula válida.']);
        }

        if (! Auth::guard('web')->attempt([$field => $identifier, 'password' => $data['password']])) {
            throw ValidationException::withMessages(['identifier' => 'Credenciales incorrectas.']);
        }

        $request->session()->regenerate();

        return redirect()->intended(
            $request->user()->role?->code === 'admin'
                ? route('admin.dashboard')
                : route('student.dashboard')
        );
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
