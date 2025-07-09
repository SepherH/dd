/**
 * 測試用酒駕累犯種子資料
 */
import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // 清空表格，重新插入種子資料
  await knex("offender_sources").del();
  await knex("offenders").del();
  
  // 插入測試用累犯資料
  const offenderIds = await knex("offenders").insert([
    {
      name: "測試人員1",
      id_number: "A123456789",
      license_plate: "ABC-1234",
      gender: "male",
      violation_date: new Date('2025-01-15'),
      case_number: "台北字第123456號",
      raw_data: JSON.stringify({
        name: "測試人員1",
        id_number: "A123456789",
        license_plate: "ABC-1234",
        violation_details: "酒測值0.55mg/L，超過法定標準0.15mg/L"
      }),
      source: "臺北監理所",
      source_url: "https://example.com/taipei/123456",
      image_url: null,
      crawl_time: new Date()
    },
    {
      name: "測試人員2",
      id_number: "B987654321",
      license_plate: "XYZ-9876",
      gender: "female",
      violation_date: new Date('2025-02-20'),
      case_number: "高雄字第654321號",
      raw_data: JSON.stringify({
        name: "測試人員2",
        id_number: "B987654321",
        license_plate: "XYZ-9876",
        violation_details: "酒測值0.60mg/L，超過法定標準0.15mg/L"
      }),
      source: "高雄監理所",
      source_url: "https://example.com/kaohsiung/654321",
      image_url: null,
      crawl_time: new Date()
    },
    {
      name: "測試人員3",
      id_number: "C567891234",
      license_plate: "DEF-5678",
      gender: "male",
      violation_date: new Date('2025-03-10'),
      case_number: "台中字第567890號",
      raw_data: JSON.stringify({
        name: "測試人員3",
        id_number: "C567891234",
        license_plate: "DEF-5678",
        violation_details: "酒測值0.75mg/L，超過法定標準0.15mg/L"
      }),
      source: "臺中監理所",
      source_url: "https://example.com/taichung/567890",
      image_url: null,
      crawl_time: new Date()
    }
  ]).returning('id');

  // 插入資料來源關聯資料
  await knex("offender_sources").insert([
    {
      offender_id: offenderIds[0],
      name: "臺北監理所",
      url: "https://example.com/taipei/123456",
      image_url: null,
      crawl_time: new Date()
    },
    {
      offender_id: offenderIds[1],
      name: "高雄監理所",
      url: "https://example.com/kaohsiung/654321",
      image_url: null,
      crawl_time: new Date()
    },
    {
      offender_id: offenderIds[2],
      name: "臺中監理所",
      url: "https://example.com/taichung/567890",
      image_url: null,
      crawl_time: new Date()
    }
  ]);
}
