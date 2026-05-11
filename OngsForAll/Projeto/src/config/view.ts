import { FastifyInstance } from 'fastify'
import pointOfView from '@fastify/view'
import handlebars from 'handlebars'
import path from 'path'

export default async function (fastify: FastifyInstance) {
  const viewsPath = path.join(__dirname, '..', 'views')

  /*
  ========================================
  HELPERS DO HANDLEBARS
  ========================================
  */

  handlebars.registerHelper('ifCond', function (this: any, a: any, operator: any, b: any, options: any) {
    // Suporta chamada com 2 args (a, b) ou 3 args (a, operator, b)
    if (options === undefined) {
      options = b
      b = operator
      return a === b ? options.fn(this) : options.inverse(this)
    }
    let result = false
    switch (operator) {
      case '==': result = a == b; break
      case '===': result = a === b; break
      case '!=': result = a != b; break
      case '!==': result = a !== b; break
      case '<': result = a < b; break
      case '>': result = a > b; break
      case '<=': result = a <= b; break
      case '>=': result = a >= b; break
      default: result = a === b
    }
    return result ? options.fn(this) : options.inverse(this)
  })

  handlebars.registerHelper('eq', function (a: any, b: any) {
    return a === b
  })

  handlebars.registerHelper('array', function (...args: any[]) {
    // O último argumento é o objeto de opções do Handlebars — removemos ele
    return args.slice(0, -1)
  })

  handlebars.registerHelper('isBem', function (tipo: any) {
    return tipo === 'bem'
  })

  /*
  ========================================
  VIEW ENGINE
  ========================================
  */

  fastify.register(pointOfView, {
    engine: {
      handlebars,
    },
    viewExt: 'hbs',
    root: viewsPath,

    options: {
      partials: {
        homenavbar: 'partials/homenavbar.hbs',
        emptyState: 'partials/emptyState.hbs',
      },
    },

    defaultContext: {
      title: 'ONG For All',
    },
  })
}