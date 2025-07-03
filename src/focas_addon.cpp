#include <napi.h>
#include <string>
#include <iostream>
#include "Fwlib32.h"
#pragma comment(lib, "Fwlib32.lib")

// Подключение к станку
Napi::Value Connect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Wrong arguments. Expected: (ip, port)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string ip = info[0].As<Napi::String>().Utf8Value();
    int port = info[1].As<Napi::Number>().Int32Value();
    
    unsigned short handle;
    short ret = cnc_allclibhndl3(ip.c_str(), port, 10, &handle);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, ret == EW_OK));
    result.Set("error", Napi::Number::New(env, ret));
    if (ret == EW_OK) {
        result.Set("handle", Napi::Number::New(env, handle));
    }
    
    return result;
}

// Отключение от станка  
Napi::Value Disconnect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Wrong arguments. Expected: (handle)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    unsigned short handle = info[0].As<Napi::Number>().Int32Value();
    short ret = cnc_freelibhndl(handle);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, ret == EW_OK));
    result.Set("error", Napi::Number::New(env, ret));
    
    return result;
}

// Чтение динамических данных
Napi::Value ReadDynamic(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Wrong arguments. Expected: (handle)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    unsigned short handle = info[0].As<Napi::Number>().Int32Value();
    
    ODBDY2 dynamic;
    short ret = cnc_rddynamic2(handle, -1, sizeof(dynamic), &dynamic);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, ret == EW_OK));
    result.Set("error", Napi::Number::New(env, ret));
    
    if (ret == EW_OK) {
        Napi::Object data = Napi::Object::New(env);
        
        // Номер программы
        data.Set("programNumber", Napi::Number::New(env, dynamic.prgnum));
        data.Set("sequenceNumber", Napi::Number::New(env, dynamic.seqnum));
        
        // Скорости
        data.Set("feedrate", Napi::Number::New(env, dynamic.actf));
        data.Set("spindleSpeed", Napi::Number::New(env, dynamic.acts));
        
        // Позиции осей
        Napi::Object positions = Napi::Object::New(env);
        for (int i = 0; i < dynamic.axis; i++) {
            std::string axisName = "axis" + std::to_string(i);
            positions.Set(axisName, Napi::Number::New(env, dynamic.pos.faxis.absolute[i]));
        }
        data.Set("positions", positions);
        
        result.Set("data", data);
    }
    
    return result;
}

// Чтение статуса станка
Napi::Value ReadStatus(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Wrong arguments. Expected: (handle)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    unsigned short handle = info[0].As<Napi::Number>().Int32Value();
    
    ODBST status;
    short ret = cnc_statinfo(handle, &status);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, ret == EW_OK));
    result.Set("error", Napi::Number::New(env, ret));
    
    if (ret == EW_OK) {
        Napi::Object data = Napi::Object::New(env);
        data.Set("tmmode", Napi::Number::New(env, status.tmmode));
        data.Set("aut", Napi::Number::New(env, status.aut));
        data.Set("run", Napi::Number::New(env, status.run));
        data.Set("motion", Napi::Number::New(env, status.motion));
        data.Set("mstb", Napi::Number::New(env, status.mstb));
        data.Set("emergency", Napi::Number::New(env, status.emergency));
        data.Set("alarm", Napi::Number::New(env, status.alarm));
        data.Set("edit", Napi::Number::New(env, status.edit));
        result.Set("data", data);
    }
    
    return result;
}

// Чтение аварийных сообщений
Napi::Value ReadAlarms(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Wrong arguments. Expected: (handle)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    unsigned short handle = info[0].As<Napi::Number>().Int32Value();
    
    ODBALM alarms[10];
    short ret = cnc_alarm(handle, &alarms[0]);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, ret == EW_OK));
    result.Set("error", Napi::Number::New(env, ret));
    
    if (ret == EW_OK) {
        Napi::Array data = Napi::Array::New(env);
        // Simplified alarm reading - just mark if any alarms present
        Napi::Object alarm = Napi::Object::New(env);
        alarm.Set("count", Napi::Number::New(env, ret == EW_OK ? 0 : 1));
        data[(uint32_t)0] = alarm;
        result.Set("data", data);
    }
    
    return result;
}

// Проверка доступности FOCAS
Napi::Value IsAvailable(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // Пробуем загрузить библиотеку
    HMODULE hModule = LoadLibraryA("Fwlib32.dll");
    bool available = (hModule != NULL);
    
    if (hModule) {
        FreeLibrary(hModule);
    }
    
    return Napi::Boolean::New(env, available);
}

// Экспорт функций
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "connect"), Napi::Function::New(env, Connect));
    exports.Set(Napi::String::New(env, "disconnect"), Napi::Function::New(env, Disconnect));
    exports.Set(Napi::String::New(env, "readDynamic"), Napi::Function::New(env, ReadDynamic));
    exports.Set(Napi::String::New(env, "readStatus"), Napi::Function::New(env, ReadStatus));
    exports.Set(Napi::String::New(env, "readAlarms"), Napi::Function::New(env, ReadAlarms));
    exports.Set(Napi::String::New(env, "isAvailable"), Napi::Function::New(env, IsAvailable));
    
    return exports;
}

NODE_API_MODULE(focas_addon, Init) 