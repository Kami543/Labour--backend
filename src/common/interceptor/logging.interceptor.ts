import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
  import { Observable, throwError } from 'rxjs';
  import { tap, catchError } from 'rxjs/operators';
  
  export interface RequestLog {
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    statusCode?: number;
    responseTime?: number;
    timestamp: string;
    error?: {
      message: string;
      code?: string;
      stack?: string;
    };
  }
  
  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);
  
    // Rotas que não devem ser logadas (sensíveis)
    private readonly excludeRoutes = ['/health', '/metrics', '/swagger'];
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();
      const method = request.method;
      const url = request.originalUrl || request.url;
  
      // Verificar se a rota deve ser excluída
      if (this.shouldExcludeRoute(url)) {
        return next.handle();
      }
  
      const startTime = Date.now();
      const requestLog: RequestLog = {
        method,
        url,
        ip: this.getClientIp(request),
        userAgent: request.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
      };
  
      // Log da requisição
      this.logRequest(requestLog);
  
      return next.handle().pipe(
        tap((data) => {
          const statusCode = response.statusCode;
          const responseTime = Date.now() - startTime;
  
          const responseLog: RequestLog = {
            ...requestLog,
            statusCode,
            responseTime,
          };
  
          this.logResponse(responseLog, data);
        }),
        catchError((error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;
  
          const errorLog: RequestLog = {
            ...requestLog,
            statusCode,
            responseTime,
            error: {
              message: error.message,
              code: error.code,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
          };
  
          this.logError(errorLog);
  
          // Registrar erro estruturado
          this.logErrorStructured(error, errorLog);
  
          return throwError(() => error);
        }),
      );
    }
  
    /**
     * Log de requisição
     */
    private logRequest(log: RequestLog): void {
      const message = `📥 ${log.method} ${log.url}`;
      const details = `IP: ${log.ip} | User-Agent: ${log.userAgent.substring(0, 50)}...`;
  
      this.logger.debug(details);
      this.logger.log(message);
    }
  
    /**
     * Log de resposta bem-sucedida
     */
    private logResponse(log: RequestLog, data: any): void {
      // FIX 1: Provide default value for undefined statusCode
      const statusCode = log.statusCode ?? 500;
      const statusColor = this.getStatusColor(statusCode);
      // FIX 2: Provide default value for undefined responseTime
      const responseTime = log.responseTime ?? 0;
      
      const message = `📤 ${statusColor} ${log.method} ${log.url} [${statusCode}] - ${responseTime}ms`;
  
      // FIX 3: Use default value in condition
      if (responseTime > 1000) {
        this.logger.warn(
          `⚠️ Resposta lenta detectada: ${log.method} ${log.url} levou ${responseTime}ms`,
        );
      } else {
        this.logger.log(message);
      }
  
      // Log estruturado
      this.logStructured(log);
    }
  
    /**
     * Log de erro
     */
    private logError(log: RequestLog): void {
      // FIX 4: Provide default values for error logging
      const responseTime = log.responseTime ?? 0;
      const statusCode = log.statusCode ?? 500;
      const message = `❌ ${log.method} ${log.url} [${statusCode}] - ${responseTime}ms`;
      this.logger.error(message);
    }
  
    /**
     * Log estruturado em JSON para melhor análise
     */
    private logStructured(log: RequestLog): void {
      // FIX 5: Provide default value for responseTime in structured log
      const structured = {
        type: 'http_request',
        timestamp: log.timestamp,
        method: log.method,
        url: log.url,
        ip: log.ip,
        statusCode: log.statusCode ?? 500,
        responseTime: log.responseTime ?? 0,
        slow: (log.responseTime ?? 0) > 1000, // FIX 6: Handle undefined
      };
  
      this.logger.debug(JSON.stringify(structured));
    }
  
    /**
     * Log estruturado de erro
     */
    private logErrorStructured(error: any, log: RequestLog): void {
      const structured = {
        type: 'http_error',
        timestamp: log.timestamp,
        method: log.method,
        url: log.url,
        ip: log.ip,
        statusCode: log.statusCode ?? 500, // FIX 7: Default value
        responseTime: log.responseTime ?? 0, // FIX 8: Default value
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
        },
      };
  
      this.logger.error(JSON.stringify(structured));
    }
  
    /**
     * Obtém o IP real do cliente (considerando proxies)
     */
    private getClientIp(request: Request): string {
      const xForwardedFor = request.headers['x-forwarded-for'];
  
      if (xForwardedFor) {
        const ips = Array.isArray(xForwardedFor)
          ? xForwardedFor[0]
          : xForwardedFor.split(',')[0];
        return ips.trim();
      }
  
      return (
        request.socket?.remoteAddress ||
        request.connection?.remoteAddress ||
        'unknown'
      );
    }
  
    /**
     * Verifica se a rota deve ser excluída do log
     */
    private shouldExcludeRoute(url: string): boolean {
      return this.excludeRoutes.some((route) => url.startsWith(route));
    }
  
    /**
     * Retorna emoji e cor baseado no status code
     */
    private getStatusColor(statusCode: number): string {
      if (statusCode >= 200 && statusCode < 300) {
        return '✅';
      }
      if (statusCode >= 300 && statusCode < 400) {
        return '🔄';
      }
      if (statusCode >= 400 && statusCode < 500) {
        return '⚠️';
      }
      return '❌';
    }
  }