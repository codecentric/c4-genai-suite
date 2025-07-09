import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskSystem1751234567891 implements MigrationInterface {
  name = 'AddTaskSystem1751234567891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if task_categories table exists
    const taskCategoriesExists = await queryRunner.hasTable('task_categories');

    if (!taskCategoriesExists) {
      // Create task_categories table
      await queryRunner.query(`
        CREATE TABLE "task_categories" (
          "id" SERIAL NOT NULL,
          "name" character varying(100) NOT NULL,
          "description" character varying(500),
          "color" character varying(7),
          "sortOrder" integer NOT NULL DEFAULT '0',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_task_categories_name" UNIQUE ("name"),
          CONSTRAINT "PK_task_categories" PRIMARY KEY ("id")
        )
      `);

      // Insert some default categories
      await queryRunner.query(`
        INSERT INTO "task_categories" ("name", "description", "color", "sortOrder") VALUES
        ('Allgemein', 'Allgemeine Aufgaben', '#6B7280', 0),
        ('Entwicklung', 'Entwicklungsaufgaben', '#3B82F6', 1),
        ('Design', 'Design und UI/UX Aufgaben', '#8B5CF6', 2),
        ('Testing', 'Test- und QA-Aufgaben', '#10B981', 3),
        ('Dokumentation', 'Dokumentationsaufgaben', '#F59E0B', 4)
      `);
    }

    // Check if tasks table exists
    const tasksExists = await queryRunner.hasTable('tasks');

    if (!tasksExists) {
      // Create enums if they don't exist
      const statusEnumExists = (await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'tasks_status_enum'
      `)) as any[];

      if (statusEnumExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'done', 'cancelled')
        `);
      }

      const priorityEnumExists = (await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'tasks_priority_enum'
      `)) as any[];

      if (priorityEnumExists.length === 0) {
        await queryRunner.query(`
          CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')
        `);
      }

      // Create tasks table
      await queryRunner.query(`
        CREATE TABLE "tasks" (
          "id" SERIAL NOT NULL,
          "title" character varying(200) NOT NULL,
          "description" text,
          "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo',
          "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium',
          "dueDate" TIMESTAMP WITH TIME ZONE,
          "assigneeId" character varying,
          "categoryId" integer,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
        )
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "tasks" 
        ADD CONSTRAINT "FK_tasks_categoryId" 
        FOREIGN KEY ("categoryId") 
        REFERENCES "task_categories"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_categoryId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "task_categories"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}
