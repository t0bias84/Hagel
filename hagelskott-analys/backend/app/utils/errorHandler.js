/***************************************
 * errorHandler.js
 * ===============
 * Samlad felhantering för projektet.
 ***************************************/

/**
 * AppError
 * --------
 * En anpassad Error-klass för att enklare
 * skapa nya fel med statuskod och meddelande.
 */
class AppError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      // Skapa en "stack trace" som pekar på var felet uppstod
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Olika feltyper och deras standardmeddelanden.
   * Lägg till / uppdatera efter behov.
   */
  const errorTypes = {
    CastError: (err) => ({
      statusCode: 400,
      message: `Ogiltigt värde för '${err.path}': '${err.value}'.`
    }),
  
    ValidationError: (err) => ({
      statusCode: 400,
      message: Object.values(err.errors)
        .map(e => e.message)
        .join('. ')
    }),
  
    DuplicateKeyError: (err) => ({
      statusCode: 400,
      message: `En ${Object.keys(err.keyValue)[0]} med värdet '${Object.values(err.keyValue)[0]}' finns redan.`
    }),
  
    TokenError: () => ({
      statusCode: 401,
      message: 'Din session har gått ut. Vänligen logga in igen.'
    }),
  
    FileUploadError: (err) => ({
      statusCode: 400,
      message: `Filuppladdningsfel: ${err.message}`
    }),
  
    ComponentError: (err) => ({
      statusCode: 400,
      message: `Komponentfel: ${err.message}`
    })
  };
  
  /**
   * handleError
   * -----------
   * Matchar ett fel mot våra definierade feltyper (errorTypes),
   * eller ger default "500, Something went wrong".
   * - Om fel har code===11000 => DuplicateKey (MongoDB duplicate)
   * - Annars kolla err.name => anrop rätt definierad errorType
   */
  const handleError = (err) => {
    // MongoDB 'duplicate key'
    if (err.code === 11000) {
      return errorTypes.DuplicateKeyError(err);
    }
  
    // Kolla om vi har en match i errorTypes
    const handler = errorTypes[err.name];
    return handler
      ? handler(err)
      : {
          statusCode: 500,
          message: 'Något gick fel på servern.'
        };
  };
  
  /**
   * errorHandler
   * ------------
   * Express middleware som fångar upp fel
   * och returnerar JSON-svar med status & meddelande.
   * - I 'development' => skicka mer info (stacktrace, etc.)
   * - I 'production'  => skicka enbart status & message
   */
  const errorHandler = (err, req, res, next) => {
    // Express standard
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    if (process.env.NODE_ENV === 'development') {
      // Logga felet i serverkonsolen
      console.error('DEV ERROR', err);
  
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,           // Hela error-objektet
        stack: err.stack      // Stack trace
      });
    } else {
      // Production mode => 'rensad' felinfo
      const cleaned = handleError(err);
      res.status(cleaned.statusCode).json({
        status: cleaned.statusCode < 500 ? 'fail' : 'error',
        message: cleaned.message
      });
    }
  };
  
  /**
   * asyncHandler
   * ------------
   * Wrapper för asynkrona Express-routehandlers.
   * Möjliggör att man slipper try/catch i varenda route.
   * Exempel:
   *    router.get('/api/stuff', asyncHandler(async (req, res, next) => {
   *      const data = await Stuff.find();
   *      res.json(data);
   *    }));
   */
  const asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  /**
   * validateFields
   * -------------
   * En middleware som säkerställer att vissa fält finns i req.body.
   * Om nåt saknas => returnera 400 (AppError).
   */
  const validateFields = (requiredFields) => {
    return (req, res, next) => {
      const missing = requiredFields.filter((field) => !req.body[field]);
      if (missing.length > 0) {
        return next(
          new AppError(
            400,
            `Saknade fält: ${missing.join(', ')}.`
          )
        );
      }
      next();
    };
  };
  
  /**
   * validateFileUpload
   * ------------------
   * En middleware för att kolla om en fil finns,
   * om filtyp är godkänd och om storleken underskrider max.
   */
  const validateFileUpload = (allowedTypes, maxSize) => {
    return (req, res, next) => {
      if (!req.file) {
        return next(
          new AppError(400, 'Ingen fil uppladdad.')
        );
      }
  
      // Kolla typ
      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(
          new AppError(
            400,
            `Ogiltig filtyp. Tillåtna typer: ${allowedTypes.join(', ')}`
          )
        );
      }
  
      // Kolla storlek
      if (req.file.size > maxSize) {
        return next(
          new AppError(
            400,
            `Filen är för stor. Max storlek: ${(maxSize / 1024 / 1024).toFixed(2)} MB.`
          )
        );
      }
  
      next();
    };
  };
  
  // Exportera
  module.exports = {
    AppError,
    errorHandler,
    asyncHandler,
    validateFields,
    validateFileUpload
  };
  